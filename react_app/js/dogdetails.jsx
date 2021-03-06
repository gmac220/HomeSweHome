import ReactDOM from 'react-dom';
import React, { Component } from 'react';
import { Button, Container, Row, Col } from 'reactstrap';
import {NavBar} from './navbar.jsx';
import InfoCard from './infocard.jsx';
import { ControlledCarousel } from './carousel.jsx';
import ParkCard from './parkcards.jsx';
import {CardDeck, CardTitle, CardText, Card, CardBody, Table} from 'reactstrap';
import * as api from './api.js';
import {PawSpinner} from './spinner.jsx';
import * as urls from './urls.js';
import FontAwesomeIcon from '@fortawesome/react-fontawesome';

export default class DogDetails extends Component {
	constructor(props) {
		super(props);

		this.state = {
			dogJSON: null,
			error: null,
			desc: null,
			desc2: null,
			description: null,
			readMore: true,
			size: 0
		}
		this.readMore = this.readMore.bind(this);
	}

	readMore(event){
		if(this.state.readMore){
			this.setState({
				readMore: false,
				description: this.state.desc2
			})
		} else {
			this.setState({
				readMore: true,
				description: this.state.desc
			})
		}
	}

	componentDidMount() {
		api.fetchDog(this.props.dogID)
		.then(dogJSON => this.setState({
			dogJSON: dogJSON,
			//desc is shortened description, desc2 is full description, description is what gets displayed
			desc : dogJSON.description ? dogJSON.description.split(" ").slice(0, 150).join(" ") : "",
			desc2 : dogJSON.description ? dogJSON.description : "",
			description : dogJSON.description ? dogJSON.description.split(" ").slice(0, 150).join(" ") : "No description available",
			size : dogJSON.description ? dogJSON.description.split(" ").length : 0
		})
	)
		.catch(error => this.setState({
			error: error.message
		}));
		api.fetchDogNearby(this.props.dogID)
		.then(nearbyJSON => this.setState({
			parkJSON: nearbyJSON["parks"]
		}))
		.catch(error => this.setState({
			error: error.message
		}));
	}

	render() {

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

		if(this.state.dogJSON == null) {
			return (
				<div>
					<NavBar/>
					<Container>
						<h1 className="text-center" style={{fontSize: '6em'}}><PawSpinner /></h1>
					</Container>
				</div>
			);
		}

		let parkList = (
			<h1 className="text-center" style={{fontSize: '6em'}}><PawSpinner /></h1>
		);
		if(!(this.state.parkJSON == null)){
			parkList = this.state.parkJSON.map(park => {
				return (
					<Col md="3">
						<ParkCard parkData={park}/>
					</Col>
				);
			})}
			let items = [];
			for(let i = 0; i < this.state.dogJSON.image_urls.length; i++){
				items.push({
					src: this.state.dogJSON.image_urls[i]
				});
			}

			const logo = [
				{
					src: "/../../static/img/homeswehomelogo.svg"
				}
			];
			let tableBody = [];
			tableBody.push(<tr>
				<th rowSpan={this.state.dogJSON.breeds.length}>Breeds</th>
				<td>{this.state.dogJSON.breeds[0]}</td>
			</tr>);
			for(let i = 1; i < this.state.dogJSON.breeds.length; i++) {
				tableBody.push(<tr>
					<td>{this.state.dogJSON.breeds[i]}</td>
				</tr>);
			}
			tableBody.push(<tr>
				<th>Altered (Spayed/Neutered)</th>
				<td>{this.state.dogJSON.altered ? "Yes" : "No"}</td>
			</tr>);
			tableBody.push(<tr>
				<th>Has Shots</th>
				<td>{this.state.dogJSON.shots ? "Yes" : "No"}</td>
			</tr>);
			tableBody.push(<tr>
				<th>House Trained</th>
				<td>{this.state.dogJSON.housetrained ? "Yes" : "No"}</td>
			</tr>);
			tableBody.push(<tr>
				<th>Friendly</th>
				<td>{this.state.dogJSON.friendly ? "Yes" : "No"}</td>
			</tr>);
			tableBody.push(<tr>
				<th>Special Needs</th>
				<td>{this.state.dogJSON.special_needs ? "Yes" : "No"}</td>
			</tr>);


			return (
				<div>
					<NavBar/>
					<br/>
					{/* might need to change this in controlled carousel */}
					<div id="dogCarousel">
						<ControlledCarousel items={this.state.dogJSON.image_urls.length > 0 ? items : logo} size={"d-block mx-auto"} style={{height:500}}/>
					</div>
					<br/>
					<Container>
						<Row className="description_box">
							<Col md="8">
								<Card>
									<CardBody>
										<CardTitle>
											<h2>{this.state.dogJSON.name}</h2>
										</CardTitle>
										<CardText>
											<h5>Description:</h5>
											<p className="description_content">{this.state.description} {this.state.readMore && this.state.size >= 150 ? "..." : ""}</p>
											{this.state.desc2.split(" ").length > 150 ? <Button className="readmore" color="primary" onClick={this.readMore}>{this.state.readMore ? "Read More" : "Read Less"}</Button> : ''}
											<h5>Information:</h5>
											<Table size="sm">
												<tbody>
													{tableBody}
												</tbody>
											</Table>
                                            <a href={urls.petfinderDogURL(this.state.dogJSON.id)}
											className="btn btn-outline-primary"><FontAwesomeIcon icon="paw"/> Visit this dog on PetFinder!</a>
										</CardText>
									</CardBody>
								</Card>
							</Col>
							<Col md="4">
								<InfoCard {...this.state.dogJSON.shelter} />
							</Col>
						</Row>
					</Container>
					<Container>
						<br/>
						<hr/>
						<h2>Nearby Parks</h2>
						<Row>
							{parkList}
						</Row>
					</Container>
				</div>
			);
		}
	}

	window._DogDetails = DogDetails;
