import json
from collections import defaultdict

from flask import send_from_directory, render_template
import requests

from server import app

import os, sys
PATH_TO_JSON = os.path.join(os.path.dirname(os.getcwd()), os.path.basename(os.getcwd()), "json")
sys.path.insert(0, PATH_TO_JSON)

@app.route("/")
def splash():
    return render_template("splash.html")


@app.route("/about/")
def about():
    users = ["EpicDavi", "gmac220", "TimCoding", "rebekkahkoo", "ewk298"]
    attrs = {user: defaultdict(int) for user in users}

    issue_params = {"state": "all"}
    issues_req = requests.get("https://api.github.com/repos/TimCoding/HomeSweHome/issues", params=issue_params)
    issues_json = issues_req.json()

    if len(issues_json) == 0:
        issues_req = requests.get("https://api.github.com/repos/TimCoding/HomeSweHome/issues", params=issue_params)
        issues_json = issues_req.json()

    total_issues = 0

    for issue in issues_json:
        user = issue["user"]["login"]
        attrs[user]["issues"] = attrs[user]["issues"] + 1
        total_issues += 1

    contribs_req = requests.get("https://api.github.com/repos/TimCoding/HomeSweHome/stats/contributors")
    contribs_json = contribs_req.json()

    if len(contribs_json) == 0:
        contribs_req = requests.get("https://api.github.com/repos/TimCoding/HomeSweHome/stats/contributors")
        contribs_json = contribs_req.json()

    total_commits = 0

    for contributor in contribs_json:
        user = contributor["author"]["login"]
        total = contributor["total"]
        attrs[user]["commits"] = attrs[user]["commits"] + total
        total_commits += total

    data = {
        "users": attrs,
        "totals": {
            "issues": total_issues,
            "commits": total_commits
        }
    }

    return render_template("about.html", gh_data=data)

@app.route("/dog_details")
def dog_details():
    dog_file = os.path.join(PATH_TO_JSON, "austin_dog.json")
    json_data = open(dog_file).read()
    dog_json = json.loads(json_data)
    
    return render_template("dog_details.html")

@app.route("/dogs")
def dog_models():
    return render_template("dog_models.html")

@app.route("/park_details")
def park_details():
    return render_template("park_details.html")

@app.route("/parks")
def park_models():
    return render_template("park_models.html")

@app.route("/shelters")
def animalshelters_models():
    return render_template("shelter_models.html")

@app.route("/shelters/1")
def animalshelter_details():
    return render_template("shelter_details.html")

@app.route("/<path:filename>")
def file(filename):
    return send_from_directory(app.static_folder, filename)
