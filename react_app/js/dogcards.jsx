import React, {Component} from 'react';
import {
  Card, CardImg, CardText, CardBody,
  CardTitle, CardSubtitle, Button
} from 'reactstrap';
import * as urls from './urls.js';
import Highlighter from "react-highlight-words";


const DogCard = (props) => {
  let dogBreed = props.dogData.breeds.map(type => {
    return (
      <li>
        <Highlighter
          searchWords={[props.query]}
          textToHighlight={type}/>
      </li>
    );
  })


  return (
    <div className="cards">
      <a href={urls.dogURL(props.dogData.id)}>
        <Card>
          <CardImg className="cardImg"
            src={props.dogData.image_urls.length > 0 ? props.dogData.image_urls[0] : "/static/img/homeswehomelogo.svg"}
            alt="Dog image" />
          <div id="hiddenText" className="hoverText">
            <CardBody>
              <h4 className="title">
                <Highlighter className="dogCardName"
                  searchWords={[props.query]}
                  textToHighlight={props.dogData.name}/>
              </h4>
              <CardText>
                <b>Breed: </b>
                <span className="dogCardBreed">{dogBreed}</span>
              </CardText>
              <CardText>
                <b>Housetrained: </b>
                <span className="dogCardHouseTrained">{props.dogData.housetrained === true ? "Yes" : "No"}</span>
              </CardText>
              <CardText>
                <b>Friendly: </b>
                <span className="dogCardFriendly">{props.dogData.friendly ? "Yes" : "No"}</span>
              </CardText>
              <CardText>
                <span><b>Address: </b>
                {props.dogData.city +", "+ props.dogData.state}
              </span>
            </CardText>
          </CardBody>
        </div>
      </Card>
    </a>
    <div hidden="true"> {/*This div is used for testing purposes*/}
      <p className="testQuery">{props.query}</p>
      <p className="testName">{props.dogData.name}</p>
      <p className="testHouseTrained">{props.dogData.housetrained}</p>
      <p className="testFriendly">{props.dogData.friendly}</p>
    </div>
  </div>
);
};

export default DogCard;

window._DogCard = DogCard
