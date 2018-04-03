import React, { Component } from 'react';
import { Container, Row, Col } from 'reactstrap';
import ReactDOM from 'react-dom';
import {NavBar} from './navbar.jsx';
import * as api from './api.js';
import {PawSpinner} from './spinner.jsx';
import DogCard from './dogcards.jsx';
import ShelterCard from './sheltercards.jsx'
import ParkCard from './parkcards.jsx';
import { Dropdown, DropdownToggle, DropdownMenu, DropdownItem,
 				 Form, FormGroup, Label, Input, FormText } from 'reactstrap';
import FontAwesomeIcon from '@fortawesome/react-fontawesome';
import {StarsRating} from './stars.jsx'

export default class ModelPage extends Component {
	constructor(props) {
		super(props);

		if(this.props.model === "dogs"){
			this.resultsPaginator = new api.Paginator(12, api.fetchDogs);
		} else if (this.props.model === "shelters") {
      this.resultsPaginator = new api.Paginator(12, api.fetchShelters);
		} else if (this.props.model === "parks") {
      this.resultsPaginator = new api.Paginator(12, api.fetchParks);
		}

		this.state = {
			results: null,
			resultsLoading: true,
			error: null,
			breedsFilterOpen: false,
			citiesFilterOpen: false,
			ratingsFilterOpen: false,
			orderByOpen: false,
			selectedBreeds: [],
			selectedCities: [],
			selectedRating: 0
		};

		this.toggleBreeds = this.toggleBreeds.bind(this);
		this.toggleCities = this.toggleCities.bind(this);
		this.toggleRatings = this.toggleRatings.bind(this);
		this.toggleOrderBy = this.toggleOrderBy.bind(this);
		this.clickLoadMore = this.clickLoadMore.bind(this);
		this.scrollHandle = this.scrollHandle.bind(this);
		this.handleOrderBy = this.handleOrderBy.bind(this);
		this.handleBreedsFilter = this.handleBreedsFilter.bind(this);
		this.handleCitiesFilter = this.handleCitiesFilter.bind(this);
		this.handleRatingsFilter = this.handleRatingsFilter.bind(this);
		this.handleSelection = this.handleSelection.bind(this);
	}

	componentDidMount() {
    window.addEventListener('scroll', this.scrollHandle);
		this.resultsPaginator.fetchFirstPage()
			.then(results => this.setState({
				results: results,
				resultsLoading: false
			}))
			.catch(error => this.setState({
				error: error.message
			}));
		if (this.props.model === "dogs") {
			api.fetchDogBreeds()
					.then(breeds => this.setState({
						breeds: breeds.results
					}))
					.catch(error => this.setState({
						error: error.message
					}));
			api.fetchDogCities()
					.then(cities => this.setState({
						cities: cities.results
					}))
					.catch(error => this.setState({
						error: error.message
					}));
		} else if (this.props.model === "parks") {
			api.fetchParkCities()
				 .then(cities => this.setState({
					 cities: cities.results
				 }))
		} else if (this.props.model === "shelters") {
			api.fetchShelterCities()
			   .then(cities => this.setState({
					 cities: cities.results
				 }))
		}
	}

	componentWillUnmount() {
      window.removeEventListener('scroll', this.scrollHandle);
	}

	clickLoadMore() {
		this.setState({
			resultsLoading: true
		});
        this.resultsPaginator.fetchNextPage()
            .then(results => this.setState({
                results: this.state.results.concat(results),
                resultsLoading: false
            }))
            .catch(error => this.setState({
                error: error.message
            }));
	}

	scrollHandle(event){
		if (this.state.resultsLoading || !this.resultsPaginator.hasNextPage()) {
			return;
		}
		// https://stackoverflow.com/questions/9439725/javascript-how-to-detect-if-browser-window-is-scrolled-to-bottom
        let scrollTop = (document.documentElement && document.documentElement.scrollTop) || document.body.scrollTop;
        let scrollHeight = (document.documentElement && document.documentElement.scrollHeight) || document.body.scrollHeight;

        let scrolledToBottom = (scrollTop + window.innerHeight) >= scrollHeight;

        if (scrolledToBottom) {
        	this.clickLoadMore();
		}
	}

	toggleBreeds() {
		this.setState({
			breedsFilterOpen: !this.state.breedsFilterOpen
		})
		alert("These are the selected breeds: " + this.state.selectedBreeds)
	}

	toggleCities() {
		this.setState({
			citiesFilterOpen: !this.state.citiesFilterOpen
		})
	}

	toggleRatings() {
		this.setState({
			ratingsFilterOpen: !this.state.ratingsFilterOpen
		})
	}

	toggleOrderBy() {
		this.setState({
			orderByOpen: !this.state.orderByOpen
		})
	}

	handleOrderBy(event) {
		this.setState({orderByValue: event.target.innerText}, function () {
			this.handleSelection()
		})
	}

	handleBreedsFilter(event) {
		if (event.currentTarget.checked == false) {
			/* remove it */
			let index = this.state.selectedBreeds.indexOf(event.currentTarget.name)
			if (index > -1) {
				this.state.selectedBreeds.splice(index, 1)
			}
		} else {
			this.state.selectedBreeds.push(event.currentTarget.name)
		}
		// alert('filter value was selected ' + this.state.selectedBreeds)
	}

	handleCitiesFilter(event) {
		if (event.currentTarget.checked == false) {
			/* remove it */
			let index = this.state.selectedCities.indexOf(event.currentTarget.name)
			if (index > -1) {
				this.state.selectedCities.splice(index, 1)
			}
		} else {
			this.state.selectedCities.push(event.currentTarget.name)
		}
		// alert('filter value was selected ' + this.state.selectedCities)
	}

	handleRatingsFilter(event) {
		// alert('order value was selected: ' + event.currentTarget.innerText)
		this.setState({
			selectedRating: parseFloat(event.currentTarget.rating)
		}, function () {
			this.handleSelection()
		})
	}

	updateQuery(){
		let query = {};
		let endpoint = null;
        query["city"] = this.state.selectedCities || [];
		if (this.props.model === "dogs"){
			endpoint = api.fetchDogsSearch;
			query["breed"] = this.state.selectedBreeds || [];
		} else if (this.props.model === "shelter") {
			if(!(this.state.selectedRating == null)) {
				query["rating"] = this.state.selectedRating;
			}
			endpoint = api.fetchSheltersSearch;
		} else if (this.props.model ===  "park") {
			endpoint = api.fetchParksSearch;
		} else {
			console.error("Shouldn't reach this");
			return;
		}

		if(!(this.state.orderByValue == null)) {
			query["orderby"] = this.state.orderByValue;
		}
		console.log(query);
		this.resultsPaginator = new api.Paginator(12, endpoint, query);
		this.resultsPaginator.fetchFirstPage()
            .then(results => this.setState({
                results: results,
                resultsLoading: false
            }))
            .catch(error => this.setState({
                error: error.message
            }));
	}

	handleSelection() {
		this.updateQuery();
	}

	renderBreedsDropdown(options) {
		return (
			<Dropdown isOpen={this.state.breedsFilterOpen}
							  toggle={this.toggleBreeds}
								style={{paddingRight: "10px"}}>
				<DropdownToggle caret>
					Breeds
				</DropdownToggle>
				<DropdownMenu className="dropdown-scroll">
					<Col>
						{options}
					</Col>
				</DropdownMenu>
			</Dropdown>
		)
	}

	renderCitiesDropdown(options) {
		return (
			<Dropdown isOpen={this.state.citiesFilterOpen}
							  toggle={this.toggleCities}
								style={{paddingRight: "10px"}}>
				<DropdownToggle caret>
					Cities
				</DropdownToggle>
				<DropdownMenu className="dropdown-scroll">
					<Col>
						{options}
					</Col>
				</DropdownMenu>
			</Dropdown>
		)
	}

	renderRatingsDropdown(options) {
		return (
			<Dropdown isOpen={this.state.ratingsFilterOpen}
								toggle={this.toggleRatings}
								style={{paddingRight: "10px"}}>
				<DropdownToggle caret>
					Ratings
				</DropdownToggle>
				<DropdownMenu className="dropdown-scroll">
					{options}
				</DropdownMenu>
			</Dropdown>
		)
	}

	renderOrderByDropdown(options) {
		return (
			<Dropdown isOpen={this.state.orderByOpen}
							  toggle={this.toggleOrderBy}>
				<DropdownToggle caret>
					Order by
				</DropdownToggle>
				<DropdownMenu>
					{options}
				</DropdownMenu>
			</Dropdown>
		)
	}

	render(){

		if(!(this.state.error == null)){
			return (
				<div>
					<NavBar/>
					<Container>
						<h1 className="text-center text-danger">{this.state.error}</h1>
					</Container>
				</div>
			);
		}

        let loadMore = [];
        if(this.state.resultsLoading){
            loadMore.push(
                <h1 className="text-center" style={{fontSize: '4.5em'}}><PawSpinner/></h1>
            );
        }
        if(this.resultsPaginator.hasNextPage()){
            loadMore.push(
                <h1 className="text-center">
                    <a href="javascript:undefined" onClick={this.clickLoadMore}>
                        <FontAwesomeIcon icon="angle-down"/>
                    </a>
                </h1>
            );
        }


		if (this.props.model === 'dogs') {
			const staticContent = (
				<div>
					<NavBar/>
					<Container>
						<Row className="models_top">
							<Col md="8">
								<p className="models_content">We at HomeSweHome believe that every dog deserves a home with a loving family.
									We also know that every dog has the potential to be a fine addition to any family. Browse through
									our list of adoptable dogs today and find a new family member. Our dogs come in all shapes and sizes, but each
									and every one of them have a huge heart made just for loving you! So stay awhile and help one of our good
									doggies find their Home Sweet Home.</p>
								<h3 className="models_content">"Dogs are not our whole life, but they make our lives whole." -Roger Caras</h3>
							</Col>
							<Col md="4">
								<img className="logo" src="/static/img/homeswehomelogo.svg"/>
							</Col>
						</Row>
					</Container>
				</div>
			);

			if(this.state.results == null) {
				return (
					<div>
						{staticContent}
						<Container>
							<h1 className="text-center" style={{fontSize: '6em'}}><PawSpinner /></h1>
						</Container>
					</div>
				);
			}

			let dogList = this.state.results.map(dog => {
				return (
					<Col md="3">
						<DogCard dogData={dog}/>
					</Col>
				);
			});

			let orderOptions = ["name"].map(option => {
				return (
					<DropdownItem onClick={this.handleOrderBy}>{option}</DropdownItem>
				)
			});


			let breedsFilter = this.state.breeds.map(breed => {
				return (
					<FormGroup check>
						<Label check>
							<Input type="checkbox"
										 onClick={this.handleBreedsFilter}
										 name={breed}/>
							 {' '}{breed}
						</Label>
					</FormGroup>
				)
			});

			let citiesFilter = this.state.cities.map(city => {
				return (
					<FormGroup check>
						<Label check>
							<Input type="checkbox"
										 onClick={this.handleCitiesFilter}
										 name={city}/>
							 {' '}{city}
						</Label>
					</FormGroup>
				)
			});

			return (
				<div>
					{staticContent}
					<Container>

						<h2>Dogs</h2>
						<br/>
						<Row>
							{this.renderBreedsDropdown(breedsFilter)}
							{this.renderCitiesDropdown(citiesFilter)}
							{this.renderOrderByDropdown(orderOptions)}
						</Row><br/>
						<Row>
							{dogList}
						</Row>
						{loadMore}
					</Container>
				</div>
			);
		}

		if (this.props.model === 'parks') {
			const staticContent = (
				<div>
					<NavBar/>
					<Container>
						<Row className="models_top">
							<Col md="8">
								<p className="models_content">There is no place like the great outdoors to make memories!
									Luckily for you we compiled a list of all the parks we think are cool. All you have to do is focus on spending
									time with your favorite four-legged buddy. Here is a selection of all parks that we
									recommend. You will find shelters and dogs in need of an adoption near each park you look at.
									Please look around and plan your first puppy date today!</p>
								<h3 className="models_content"> "It is amazing how much love and laughter they bring into our lives and even how much closer
									we become with each other because of them." – John Grogan
								</h3>
							</Col>
							<Col md="4">
								<img className="logo" src="/static/img/homeswehomelogo.svg"/>
							</Col>
						</Row>
					</Container>
				</div>
			);

			if(this.state.results == null) {
				return (
					<div>
						{staticContent}
						<Container>
							<h1 className="text-center" style={{fontSize: '6em'}}><PawSpinner /></h1>
						</Container>
					</div>
				);
			}

			let parkList = this.state.results.map(park => {
				return (
					<Col md="3">
						<ParkCard parkData={park}/>
					</Col>
				);
			});

			let orderOptions = ["name", "yelp_rating"].map(option => {
				return (
					<DropdownItem onClick={this.handleOrderBy}>{option}</DropdownItem>
				)
			});

			let citiesFilter = this.state.cities.map(city => {
				return (
					<FormGroup check>
						<Label check>
							<Input type="checkbox"
										 onClick={this.handleCitiesFilter}
										 name={city}/>
							 {' '}{city}
						</Label>
					</FormGroup>
				)
			});

			let ratingsFilter = [1, 2, 3, 4].map(rating => {
				return (
					<DropdownItem onClick={this.handleRatingsFilter}
												rating={rating}>
												<StarsRating rating={rating}/> and up
					</DropdownItem>
				)
			});

			return (
				<div>
					{staticContent}
					<hr></hr>
					<Container>
						<h2>Parks</h2>
							<Row>
								{this.renderCitiesDropdown(citiesFilter)}
								{this.renderRatingsDropdown(ratingsFilter)}
								{this.renderOrderByDropdown(orderOptions)}
							</Row><br/>
						<Row>
							{parkList}
						</Row>
						{loadMore}
					</Container>
				</div>
			);
		}

		if (this.props.model === 'shelters') {
			const staticContent = (
				<div>
					<NavBar/>
					<Container>
						<Row className="models_top">
							<Col md="8">
								<p className="models_content">Here you can browse a variety of adoption centers or animal shelters around Texas. Take a look around, your new best friend is waiting!</p>
								<h3 className="models_content">"Dogs are great. Why stop at one? Get two, or three, or four. Just get the whole damn
									shelter. Wouldn't you agree?" -Timothy Ho
								</h3>
							</Col>
							<Col md="4">
								<img className="logo" src="/static/img/homeswehomelogo.svg"/>
							</Col>
						</Row>
					</Container>
				</div>
			);

			if(this.state.results == null) {
				return (
					<div>
						{staticContent}
						<Container>
							<h1 className="text-center" style={{fontSize: '6em'}}><PawSpinner /></h1>
						</Container>
					</div>
				);
			}

			let shelterList = this.state.results.map(shelter => {
				return (
					<Col md="3">
						<ShelterCard shelterData={shelter}/>
					</Col>
				);
			});

			let orderOptions = ["name"].map(option => {
				return (
					<DropdownItem onClick={this.handleOrderBy}>{option}</DropdownItem>
				)
			});

			let filterOptions = this.state.cities.map(city => {
				return (
					<FormGroup check>
						<Label check>
							<Input type="checkbox"
								     name={city}/>
							 {' '}{city}
						</Label>
					</FormGroup>
				)
			});

			return (
				<div>
					{staticContent}
					<Container>
						<h2>Shelters</h2>
						<Row>
							{this.renderCitiesDropdown(filterOptions)}
							{this.renderOrderByDropdown(orderOptions)}
						</Row><br/>
						<Row>
							{shelterList}
						</Row>
						{loadMore}
					</Container>
				</div>
			);
		}

	}
}

window._ModelPage = ModelPage;
