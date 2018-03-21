import ReactDOM from 'react-dom';
import React, { Component } from 'react';
import { Container, Row, Col } from 'reactstrap';
import {NavBar} from './navbar.jsx';
import InfoCard from './infocard.jsx';
import { ControlledCarousel } from './carousel.jsx';
import ParkCard from './parkcards.jsx';
import {CardDeck} from 'reactstrap';
import * as api from './api.js';
import {PawSpinner} from './spinner.jsx';

export default class DogDetails extends Component {
	constructor(props) {
		super(props);

		this.state = {
            dogJSON: null,
            error: null,
        }
	}

	componentDidMount() {
        api.fetchDog(this.props.dogID)
            .then(dogJSON => this.setState({
                dogJSON: dogJSON
            }))
            .catch(error => this.setState({
                error: "DAMN"
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


        const items = [
		  {
		    src: this.state.dogJSON.image_urls[0],
		  },
		  {
		    src: this.state.dogJSON.image_urls[1],
		  },
		  {
		    src: this.state.dogJSON.image_urls[2],
		  }
		];

		return (
			<div>
				<NavBar/>
				<br/>
				<ControlledCarousel items={items} size={"d-block mx-auto"} style={{height:500}}/>
				<br/>
				<Container>
					<Row className="description_box">
						<Col md="8">
							<h5>{this.state.dogJSON.name}'s Description</h5>
							<p className="description_content">{this.state.dogJSON.description}</p>
						</Col>
						<Col md="4">
							<InfoCard id={this.state.dogJSON.shelter_id} center={this.state.dogJSON.shelter.name} address={this.state.dogJSON.address} city={this.state.dogJSON.city} state={this.state.dogJSON.state} zip={this.state.dogJSON.zipcode} phone={this.state.dogJSON.phone} />
						</Col>
					</Row>
				</Container>
				<Container>
				<h2>Recommended Parks</h2>
					<CardDeck>
						<Row>
							<ParkCard/>
							<ParkCard/>
						</Row>
					</CardDeck>
				</Container>
			</div>
		);
	}
}

window._DogDetails = DogDetails;
