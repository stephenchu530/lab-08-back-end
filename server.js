'use strict';

require('dotenv').config();
const superagent = require('superagent');
const express = require('express');
const app = express();
const cors = require('cors');
const PORT = process.env.PORT || 3000;

app.use(cors());

app.get('/hello', (request, response) => {
  response.status(200).send('Hello');
});

app.get('/location', (request, response) => {
  const queryData = request.query.data;
  let geocodeURL = `https://maps.googleapis.com/maps/api/geocode/json?address=${queryData}&key=${process.env.GEOCODE_API_KEY}`;
  superagent.get(geocodeURL)
    .end((err, res) => {
      if (err && err.status !== 200) {
        const errorResponse500 = {'status': 500, 'responseText': 'Sorry, something went wrong' };

        response.status(500).send(errorResponse500);
      } else {
        const location = new Location(queryData, res);
        response.status(200).send(location);
      }
    });
});

app.get('/weather', (request, response) => {
  const lat = request.query.data.latitude;
  const lng = request.query.data.longitude;
  const weatherURL =`https://api.darksky.net/forecast/${process.env.WEATHER_API_KEY}/${lat},${lng}`;
  superagent.get(weatherURL)
    .end((err, res) => {
      if (err && err.status !== 200) {
        const errorResponse500 = {'status': 500, 'responseText': 'Sorry, something went wrong' };

        response.status(500).send(errorResponse500);
      } else {
        const weather = new Weather(res);
        response.status(200).send(weather.dailyForecast);
      }
    });
});

app.get('/events', (request, response) => {
  const lat = request.query.data.latitude;
  const lng = request.query.data.longitude;
  const eventURL =`https://www.eventbriteapi.com/v3/events/search?location.longitude=${lng}&location.latitude=${lat}&expand=venue&token=${process.env.EVENTBRITE_API_KEY}`;
  superagent.get(eventURL)
    .end((err, res) => {
      if (err && err.status !== 200) {
        const errorResponse500 = {'status': 500, 'responseText': 'Sorry, something went wrong' };

        response.status(500).send(errorResponse500);
      } else {
        const event = new Event(res);
        response.status(200).send(event.events);
      }
    });
});


app.use('*', (request, response) => response.send('Sorry, that route does not exist.'));

app.listen(PORT,() => console.log(`Listening on port ${PORT}`));

const Location = function(searchQuery, jsonData) {
  const formattedQuery = jsonData.body['results'][0]['formatted_address'];
  const latitude = jsonData.body['results'][0]['geometry']['location']['lat'];
  const longitude = jsonData.body['results'][0]['geometry']['location']['lng'];

  this.search_query = searchQuery;
  this.formatted_query = formattedQuery;
  this.latitude = latitude;
  this.longitude = longitude;
};

const Weather = function(jsonData) {
  this.dailyForecast = [...jsonData.body.daily.data].map(forecast => {
    const summary = forecast['summary'];
    const time = (new Date(forecast['time'] * 1000)).toDateString();
    return {
      'forecast': summary,
      'time': time
    };
  });
};

const Event = function(jsonData) {
  this.events = [...jsonData.body.events].slice(0, 20).map((event) => {
    const link = event.url;
    const name = event.name.text;
    const event_date = new Date(event.start.utc).toDateString();
    const summary = event.description.text;

    return {
      'link': link,
      'name': name,
      'event_date': event_date,
      'summary': summary
    };
  });
};
