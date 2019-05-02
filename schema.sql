DROP TABLE IF EXISTS location;
DROP TABLE IF EXISTS weather;
DROP TABLE IF EXISTS event;
CREATE TABLE location (
  latitude DECIMAL,
  longitude DECIMAL,
  formatted_query VARCHAR(255),
  search_query VARCHAR(255)
);
CREATE TABLE weather (
  forecast VARCHAR(255),
  time VARCHAR(15)
);
CREATE TABLE event (
  link VARCHAR(255),
  name VARCHAR(255),
  event_date VARCHAR(15),
  summary TEXT
);
