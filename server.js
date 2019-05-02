'use strict';

require('dotenv').config();
const superagent = require('superagent');
const express = require('express');
const app = express();
const cors = require('cors');
const PORT = process.env.PORT || 3000;
const pg = require('pg');

app.use(cors());

const pgClient = new pg.Client(process.env.DATABASE_URL);
pgClient.connect();

app.get('/location', (request, response) => {
  const queryData = request.query.data;
  checkLocationDB(queryData,response);
});

app.get('/weather', (request, response) => {
  checkOtherDB(request, response, 'weather', errorHandler);
});

app.get('/events', (request, response) => {
  checkOtherDB(request, response, 'event', errorHandler);
});


app.use('*', (request, response) => response.send('Sorry, that route does not exist.'));

app.listen(PORT,() => console.log(`Listening on port ${PORT}`));

const Location = function(searchQuery, jsonData) {
  const formattedQuery = jsonData['formatted_address'];
  const latitude = jsonData['geometry']['location']['lat'];
  const longitude = jsonData['geometry']['location']['lng'];

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

const checkLocationDB = function(queryData, response){
  const sqlStatement = 'SELECT * FROM location WHERE search_query = $1';
  const values = [ queryData ];
  return pgClient.query(sqlStatement,values).then((data) => {
    if(data.rowCount) {
      return response.status(200).send(data.rows[0]);

    } else {
      let geocodeURL = `https://maps.googleapis.com/maps/api/geocode/json?address=${queryData}&key=${process.env.GEOCODE_API_KEY}`;
      superagent.get(geocodeURL)
        .end((err, res) => {
          if (err && err.status !== 200) {
            const errorResponse500 = {'status': 500, 'responseText': 'Sorry, something went wrong' };
            return response.status(500).send(errorResponse500);
          } else {
            let location = new Location(queryData, res.body.results[0]);
            const sqlInsert = 'INSERT INTO location (latitude, longitude, formatted_query, search_query) VALUES ($1, $2, $3, $4)';
            const args = [ location.latitude, location.longitude, location.formatted_query, location.search_query];

            pgClient.query(sqlInsert, args);
            return response.status(200).send(location);
          }
        });
    }
  });
};

const checkOtherDB = function(queryData, response, tableName, errorHandler){
  const weatherURL =`https://api.darksky.net/forecast/${process.env.WEATHER_API_KEY}/${queryData.query.data.latitude},${queryData.query.data.longitude}`;
  const eventURL =`https://www.eventbriteapi.com/v3/events/search?location.longitude=${queryData.query.data.longitude}&location.latitude=${queryData.query.data.latitude}&expand=venue&token=${process.env.EVENTBRITE_API_KEY}`;
  let sqlStatement;
  if (tableName === 'weather'){
    sqlStatement = 'SELECT * FROM weather WHERE search_query = $1';
  } else {
    sqlStatement = 'SELECT * FROM event WHERE search_query = $1';
  }
  let values = [ queryData.query.data.search_query ];
  return pgClient.query(sqlStatement, values).then((data) => {
    if(data.rowCount) {
      let arr;
      if (tableName === 'weather'){
        arr = 'dailyforecast';
      } else {
        arr = 'events';
      }
      return response.status(200).send(data.rows[0][arr]);
    } else {
      let URL;
      if (tableName === 'weather'){
        URL = weatherURL;
      } else {
        URL = eventURL;
      }
      superagent.get(URL)
        .end((err, res) => {
          if (err && err.status !== 200) {
            errorHandler(response, 500);
          } else {
            let resultObject;
            let sqlInsert;
            let args;
            if (tableName === 'weather') {
              resultObject = new Weather(res);
              sqlInsert = 'INSERT INTO weather (dailyForecast, search_query) VALUES ($1, $2)';
              args = [JSON.stringify(resultObject.dailyForecast), queryData.query.data.search_query];
              pgClient.query(sqlInsert, args);
              return response.status(200).send(resultObject.dailyForecast);

            } else {
              resultObject = new Event(res);
              sqlInsert = 'INSERT INTO event (events, search_query) VALUES ($1, $2)';
              args = [JSON.stringify(resultObject.events), queryData.query.data.search_query];
              pgClient.query(sqlInsert, args);
              return response.status(200).send(resultObject.events);
            }
          }
        });
    }
  });
};

const errorHandler = function(res, code) {
  const errorResponse = {'status': code, 'responseText': 'Sorry, something went wrong' };
  return res.status(500).send(errorResponse);
};
