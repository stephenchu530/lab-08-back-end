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
  dailyForecast JSON,
  search_query VARCHAR(255)
);
CREATE TABLE event (
  events JSON,
  search_query VARCHAR(255)
);
