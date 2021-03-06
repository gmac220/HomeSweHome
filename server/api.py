from contextlib import contextmanager
from functools import wraps

from flask import jsonify, request
from sqlalchemy import or_, desc, asc

from server import app
from server.models import Dog, Shelter, Park, Breed
from server.database import db_session
from server.geo import order_zips, ZipNotFoundException

NEARBY_LIMIT = 8


class ResponseError(Exception):

    def __init__(self, message, response):
        super().__init__(message)
        self.response = response


@contextmanager
def make_session():
    session = db_session()
    yield session
    session.close()


def retry_once(f):
    @wraps(f)
    def wrapped(*args, **kwargs):
        r = None
        try:
            r = f(*args, **kwargs)
        except Exception as e1:
            print("Failed Once")
            print(e1)
            try:
                r = f(*args, **kwargs)
            except Exception as e2:
                print("Failed Twice")
                raise e2
        return r
    return wrapped


def convert_error_response(f):
    @wraps(f)
    def wrapped(*args, **kwargs):
        try:
            return f(*args, **kwargs)
        except ResponseError as e:
            return e.response
    return wrapped


def raise_error(message, code=400):
    return jsonify({
        "message": message,
        "code": code
    }), code


def get_int_arg(arg, default):
    try:
        return int(request.args.get(arg, default))
    except TypeError:
        raise ResponseError(
            "Argument is not int.",
            raise_error("The {0} argument must be an integer!".format(arg), 400)
        )


@app.route("/api/")
def api_root():
    return "See https://epicdavi.gitbooks.io/api/ for more information"


@app.route("/api/dog/<int:dog_id>/")
@retry_once
@convert_error_response
def get_dog(dog_id):
    with make_session() as session:
        dog = session.query(Dog).get(dog_id)
        if dog is None:
            return raise_error("A dog with that ID was not found.", 404)
        dog_json = dog.jsonify()
        dog_json["shelter"] = dog.shelter.jsonify()
        return jsonify(dog_json)


@app.route("/api/dog/<int:dog_id>/nearby/")
@retry_once
@convert_error_response
def get_dog_nearby(dog_id):
    with make_session() as session:
        dog = session.query(Dog).get(dog_id)
        if dog is None:
            return raise_error("A dog with that ID was not found.", 404)
        zipcode = dog.zipcode
        try:
            nearby_zips = order_zips(zipcode)[0:10]
        except ZipNotFoundException:
            return jsonify({
                "parks": [],
                "shelters": []
            })
        parks = session.query(Park).filter(Park.zipcode.in_(nearby_zips)).limit(NEARBY_LIMIT).all()
        shelters = session.query(Shelter).filter(Shelter.zipcode.in_(nearby_zips)).limit(NEARBY_LIMIT).all()
        return jsonify({
            "parks": [
                park.jsonify() for park in parks
            ],
            "shelters": [
                shelter.jsonify() for shelter in shelters
            ]
        })


@app.route("/api/dogs/")
@retry_once
@convert_error_response
def get_dogs():
    with make_session() as session:
        start = get_int_arg("start", 0)
        limit = get_int_arg("limit", 10)
        if start < 0:
            return raise_error("The start parameter must be non-negative.")
        if limit <= 0:
            return raise_error("The limit parameter must be greater than 0.")
        base_query = session.query(Dog)
        count = base_query.count()
        dogs = base_query.offset(start).limit(limit).all()
        return jsonify({
            "start": start,
            "limit": limit,
            "total": count,
            "results": [
                dog.jsonify() for dog in dogs
            ]
        })


@app.route("/api/dogs/breeds/")
@retry_once
@convert_error_response
def get_breeds():
    with make_session() as session:
        breeds = session.query(Breed.breed).distinct().all()
        return jsonify({
            "results": [
                breed[0] for breed in breeds
            ]
        })


@app.route("/api/dogs/cities/")
@retry_once
@convert_error_response
def get_dog_cities():
    with make_session() as session:
        cities = session.query(Dog.city).distinct().all()
        return jsonify({
            "results": [
                city[0] for city in cities
            ]
        })


@app.route("/api/dogs/search/")
@retry_once
@convert_error_response
def search_dogs():
    with make_session() as session:
        start = get_int_arg("start", 0)
        limit = get_int_arg("limit", 10)
        if start < 0:
            return raise_error("The start parameter must be non-negative.")
        if limit <= 0:
            return raise_error("The limit parameter must be greater than 0.")
        breeds_filters = request.args.getlist("breed")
        cities_filters = request.args.getlist("city")
        order_by_fields = request.args.getlist("orderby")
        order_by_orders = request.args.getlist("sort")
        base_query = session.query(Dog)
        if len(breeds_filters) > 0:
            base_query = base_query.join(Breed).filter(Breed.breed.in_(breeds_filters))
        if len(cities_filters) > 0:
            base_query = base_query.filter(Dog.city.in_(cities_filters))
        if len(order_by_fields) > 0:
            sorts = []
            for idx, field in enumerate(order_by_fields):
                if field not in Dog.sortable:
                    return raise_error("The orderby field should be one of {0}.".format(",".join(Dog.sortable)))
                order = order_by_orders[idx].upper() if idx < len(order_by_orders) else "ASC"
                if order == "ASC":
                    sorts.append(asc(getattr(Dog, field)))
                elif order == "DESC":
                    sorts.append(desc(getattr(Dog, field)))
                else:
                    return raise_error("The sort order should be 'ASC' or 'DESC'.")
            base_query = base_query.order_by(*reversed(sorts))

        base_query = base_query.distinct()
        count = base_query.count()
        dogs = base_query.offset(start).limit(limit).all()
        return jsonify({
            "start": start,
            "limit": limit,
            "total": count,
            "results": [
                dog.jsonify() for dog in dogs
            ]
        })


@app.route("/api/dogs/search/full/")
@retry_once
@convert_error_response
def search_dogs_full():
    with make_session() as session:
        start = get_int_arg("start", 0)
        limit = get_int_arg("limit", 10)
        if start < 0:
            return raise_error("The start parameter must be non-negative.")
        if limit <= 0:
            return raise_error("The limit parameter must be greater than 0.")
        query = request.args.get("query", "").strip()
        if len(query) == 0:
            return raise_error("The query must be non-empty!")
        base_query = session.query(Dog).join(Breed)
        filters = [getattr(Dog, field).ilike('%{0}%'.format(query)) for field in Dog.searchable]
        filters.append(Breed.breed.ilike('%{0}%'.format(query)))
        if query.isdigit():
            zipcode = int(query)
            filters.append(Dog.zipcode == zipcode)
        base_query = base_query.filter(or_(*filters))
        base_query = base_query.distinct()
        count = base_query.count()
        dogs = base_query.offset(start).limit(limit).all()
        return jsonify({
            "start": start,
            "limit": limit,
            "total": count,
            "results": [
                dog.jsonify() for dog in dogs
            ]
        })


@app.route("/api/shelter/<shelter_id>/")
@retry_once
@convert_error_response
def get_shelter(shelter_id):
    with make_session() as session:
        shelter = session.query(Shelter).get(shelter_id)
        if shelter is None:
            return raise_error("A shelter with that ID was not found.", 404)
        shelter_json = shelter.jsonify()
        return jsonify(shelter_json)


@app.route("/api/shelter/<shelter_id>/dogs/")
@retry_once
@convert_error_response
def get_dogs_in_shelter(shelter_id):
    with make_session() as session:
        start = get_int_arg("start", 0)
        limit = get_int_arg("limit", 10)
        if start < 0:
            return raise_error("The start parameter must be non-negative.")
        if limit <= 0:
            return raise_error("The limit parameter must be greater than 0.")
        base_query = session.query(Dog).filter(Dog.shelter_id == shelter_id)
        count = base_query.count()
        dogs = base_query.offset(start).limit(limit).all()

        return jsonify({
            "start": start,
            "limit": limit,
            "total": count,
            "results": [
                dog.jsonify() for dog in dogs
            ]
        })


@app.route("/api/shelter/<shelter_id>/nearby/")
@retry_once
@convert_error_response
def get_shelter_nearby(shelter_id):
    with make_session() as session:
        shelter = session.query(Shelter).get(shelter_id)
        if shelter is None:
            return raise_error("A shelter with that ID was not found.")
        zipcode = shelter.zipcode
        try:
            nearby_zips = order_zips(zipcode)[0:10]
        except ZipNotFoundException:
            return jsonify({
                "parks": [],
                "dogs": []
            })
        parks = session.query(Park).filter(Park.zipcode.in_(nearby_zips)).limit(NEARBY_LIMIT).all()
        dogs = session.query(Dog).filter(Dog.zipcode.in_(nearby_zips)).limit(NEARBY_LIMIT).all()
        return jsonify({
            "parks": [
                park.jsonify() for park in parks
            ],
            "dogs": [
                dog.jsonify() for dog in dogs
            ]
        })


@app.route("/api/shelters/")
@retry_once
@convert_error_response
def get_shelters():
    with make_session() as session:
        start = get_int_arg("start", 0)
        limit = get_int_arg("limit", 10)
        if start < 0:
            return raise_error("The start parameter must be non-negative.")
        if limit <= 0:
            return raise_error("The limit parameter must be greater than 0.")
        base_query = session.query(Shelter)
        count = base_query.count()
        shelters = base_query.offset(start).limit(limit).all()
        return jsonify({
            "start": start,
            "limit": limit,
            "total": count,
            "results": [
                shelter.jsonify() for shelter in shelters
            ]
        })


@app.route("/api/shelters/cities/")
@retry_once
@convert_error_response
def get_shelter_cities():
    with make_session() as session:
        cities = session.query(Shelter.city).distinct()
        return jsonify({
            "results": [
                city[0] for city in cities
            ]
        })


@app.route("/api/shelters/search/")
@retry_once
@convert_error_response
def search_shelters():
    with make_session() as session:
        start = get_int_arg("start", 0)
        limit = get_int_arg("limit", 10)
        if start < 0:
            return raise_error("The start parameter must be non-negative.")
        if limit <= 0:
            return raise_error("The limit parameter must be greater than 0.")
        cities_filters = request.args.getlist("city")
        order_by_fields = request.args.getlist("orderby")
        order_by_orders = request.args.getlist("sort")
        base_query = session.query(Shelter)
        if len(cities_filters) > 0:
            base_query = base_query.filter(Shelter.city.in_(cities_filters))
        if len(order_by_fields) > 0:
            sorts = []
            for idx, field in enumerate(order_by_fields):
                if field not in Shelter.sortable:
                    return raise_error("The orderby field should be one of {0}.".format(",".join(Shelter.sortable)))
                order = order_by_orders[idx].upper() if idx < len(order_by_orders) else "ASC"
                if order == "ASC":
                    sorts.append(asc(getattr(Shelter, field)))
                elif order == "DESC":
                    sorts.append(desc(getattr(Shelter, field)))
                else:
                    return raise_error("The sort order should be 'ASC' or 'DESC'.")
            base_query = base_query.order_by(*reversed(sorts))

        count = base_query.count()
        shelters = base_query.offset(start).limit(limit).all()
        return jsonify({
            "start": start,
            "limit": limit,
            "total": count,
            "results": [
                shelter.jsonify() for shelter in shelters
            ]
        })


@app.route("/api/shelters/search/full/")
@retry_once
@convert_error_response
def search_shelter_full():
    with make_session() as session:
        start = get_int_arg("start", 0)
        limit = get_int_arg("limit", 10)
        if start < 0:
            return raise_error("The start parameter must be non-negative.")
        if limit <= 0:
            return raise_error("The limit parameter must be greater than 0.")
        query = request.args.get("query", "").strip()
        if len(query) == 0:
            return raise_error("The query must be non-empty!")
        base_query = session.query(Shelter)
        filters = [getattr(Shelter, field).ilike('%{0}%'.format(query)) for field in Shelter.searchable]
        if query.isdigit():
            zipcode = int(query)
            filters.append(Shelter.zipcode == zipcode)
        base_query = base_query.filter(or_(*filters))
        count = base_query.count()
        shelters = base_query.offset(start).limit(limit).all()
        return jsonify({
            "start": start,
            "limit": limit,
            "total": count,
            "results": [
                shelter.jsonify() for shelter in shelters
            ]
        })


@app.route("/api/park/<park_id>/")
@retry_once
@convert_error_response
def get_park(park_id):
    with make_session() as session:
        park = session.query(Park).get(park_id)
        if park is None:
            return raise_error("A park with that ID was not found.", 404)
        park_json = park.jsonify()
        return jsonify(park_json)


@app.route("/api/park/<park_id>/nearby/")
@retry_once
@convert_error_response
def get_park_nearby(park_id):
    with make_session() as session:
        park = session.query(Park).get(park_id)
        if park is None:
            return raise_error("A park with that ID was not found.", 404)
        zipcode = park.zipcode
        try:
            nearby_zips = order_zips(zipcode)[0:10]
        except ZipNotFoundException:
            return jsonify({
                "dogs": [],
                "shelters": []
            })
        shelters = session.query(Shelter).filter(Shelter.zipcode.in_(nearby_zips)).limit(NEARBY_LIMIT).all()
        dogs = session.query(Dog).filter(Dog.zipcode.in_(nearby_zips)).limit(NEARBY_LIMIT).all()
        return jsonify({
            "shelters": [
                shelter.jsonify() for shelter in shelters
            ],
            "dogs": [
                dog.jsonify() for dog in dogs
            ]
        })


@app.route("/api/parks/")
@retry_once
@convert_error_response
def get_parks():
    with make_session() as session:
        start = get_int_arg("start", 0)
        limit = get_int_arg("limit", 10)
        if start < 0:
            return raise_error("The start parameter must be non-negative.")
        if limit <= 0:
            return raise_error("The limit parameter must be greater than 0.")
        base_query = session.query(Park)
        count = base_query.count()
        parks = base_query.offset(start).limit(limit).all()
        return jsonify({
            "start": start,
            "limit": limit,
            "total": count,
            "results": [
                park.jsonify() for park in parks
            ]
        })


@app.route("/api/parks/cities/")
@retry_once
@convert_error_response
def get_parks_cities():
    with make_session() as session:
        cities = session.query(Park.city).distinct()
        return jsonify({
            "results": [
                city[0] for city in cities
            ]
        })


@app.route("/api/parks/search/")
@retry_once
@convert_error_response
def search_parks():
    with make_session() as session:
        start = get_int_arg("start", 0)
        limit = get_int_arg("limit", 10)
        if start < 0:
            return raise_error("The start parameter must be non-negative.")
        if limit <= 0:
            return raise_error("The limit parameter must be greater than 0.")
        cities_filters = request.args.getlist("city")
        rating_lower_bound = request.args.get("rating")
        order_by_fields = request.args.getlist("orderby")
        order_by_orders = request.args.getlist("sort")
        base_query = session.query(Park)
        if rating_lower_bound is not None:
            try:
                rating_lower_bound = float(rating_lower_bound)
            except TypeError:
                return raise_error("The rating field must be a floating point number.")
            base_query = base_query.filter(Park.yelp_rating >= rating_lower_bound)
        if len(cities_filters) > 0:
            base_query = base_query.filter(Park.city.in_(cities_filters))
        if len(order_by_fields) > 0:
            sorts = []
            for idx, field in enumerate(order_by_fields):
                if field not in Park.sortable:
                    return raise_error("The orderby field should be one of {0}.".format(",".join(Park.sortable)))
                order = order_by_orders[idx].upper() if idx < len(order_by_orders) else "ASC"
                if order == "ASC":
                    sorts.append(asc(getattr(Park, field)))
                elif order == "DESC":
                    sorts.append(desc(getattr(Park, field)))
                else:
                    return raise_error("The sort order should be 'ASC' or 'DESC'.")
            base_query = base_query.order_by(*reversed(sorts))

        count = base_query.count()
        parks = base_query.offset(start).limit(limit).all()
        return jsonify({
            "start": start,
            "limit": limit,
            "total": count,
            "results": [
                park.jsonify() for park in parks
            ]
        })


@app.route("/api/parks/search/full/")
@retry_once
@convert_error_response
def search_park_full():
    with make_session() as session:
        start = get_int_arg("start", 0)
        limit = get_int_arg("limit", 10)
        if start < 0:
            return raise_error("The start parameter must be non-negative.")
        if limit <= 0:
            return raise_error("The limit parameter must be greater than 0.")
        query = request.args.get("query", "").strip()
        if len(query) == 0:
            return raise_error("The query must be non-empty!")
        base_query = session.query(Park)
        filters = [getattr(Park, field).ilike('%{0}%'.format(query)) for field in Park.searchable]
        if query.isdigit():
            zipcode = int(query)
            filters.append(Park.zipcode == zipcode)
        base_query = base_query.filter(or_(*filters))
        count = base_query.count()
        parks = base_query.offset(start).limit(limit).all()
        return jsonify({
            "start": start,
            "limit": limit,
            "total": count,
            "results": [
                park.jsonify() for park in parks
            ]
        })
