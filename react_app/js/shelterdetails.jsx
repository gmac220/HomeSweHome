import {NavBar} from './navbar.jsx';
import React, {Component} from 'react';
import {Container, Row, Col} from 'reactstrap';
import {CardDeck} from 'reactstrap';
import ShelterInfo from './shelterinfo.jsx';
import Map from './map.jsx';
import ShelterHours from './shelterhours.jsx';
import Reviews from './reviews.jsx';
import ParkCard from './parkcards.jsx';
import DogCard from './dogcards.jsx';
import {PawSpinner} from './spinner.jsx';

import * as api from './api.js';


export class ShelterDetails extends Component {
    constructor(props) {
        super(props);

        this.state = {
            shelterJSON: null,
            error: null
        }
    }

    componentDidMount() {
        api.fetchShelter(this.props.shelterID)
            .then(shelterJSON => this.setState({
                shelterJSON: shelterJSON
            }))
            .catch(error => this.setState({
                error: "DAMN"
            }));
        api.fetchShelterNearby(this.props.shelterID)
            .then(nearbyJSON => this.setState({
                parkJSON: nearbyJSON["parks"]
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
        if(this.state.shelterJSON == null) {
            return (
                <div>
                    <NavBar/>
                    <Container>
                        <h1 className="text-center" style={{fontSize: '6em'}}><PawSpinner /></h1>
                    </Container>
                </div>
            );
        }
        let dogList = this.state.shelterJSON.dogs.map(dogi => {
            return (
                // <CardDeck>
                <Col>
                    <DogCard dogData={dogi}/>
                </Col>
            );
        })
        let parkList = (
            <h1 className="text-center" style={{fontSize: '6em'}}><PawSpinner /></h1>
        );
        if(!(this.state.parkJSON == null)){
         parkList = this.state.parkJSON.map(park => {
            return (
                <Col>
                    <ParkCard parkData={park}/>
                </Col>
            );
        })
         }
        return (
            <div>
                <NavBar/>
                <br/>
                <ShelterInfo shelterJSON={this.state.shelterJSON}/>
                {/*<ShelterInfo/>*/}

                <Container>
                    <Row>
                        <Col xs="8">
                            <Map isMarkerShown
                              googleMapURL="https://maps.googleapis.com/maps/api/js?v=3.exp&libraries=geometry,drawing,places"
                              loadingElement={<div style={{ height: `100%` }} />}
                              containerElement={<div style={{ height: `400px` }} />}
                              mapElement={<div style={{ height: `100%` }} />}/>
                        </Col>
                        <Col xs="4">
                            {/* <ShelterHours/> */}
                        </Col>
                    </Row>
                </Container>
                <br/>

                <Container>
                    <Row>
                        <Col>
                            <Reviews desc={this.state.shelterJSON}/>
                        </Col>
                    </Row>
                </Container>
                <br/>

                <hr></hr>

                <Container>
                    <h2>Recommended Dogs</h2>
                        <Row>
                            {dogList}
                        </Row>
                </Container>
                <br/>

                <hr></hr>

                <Container>
                    <h2>Recommended Parks</h2>
                    <CardDeck>
                        <Row>
                            {parkList}
                        </Row>
                    </CardDeck>
                </Container>
                <br/>
			</div>
		)
	}
}

window._ShelterDetails = ShelterDetails;
