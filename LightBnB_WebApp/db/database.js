const { query } = require("express");
const properties = require("./json/properties.json");
const users = require("./json/users.json");
const { Pool } = require('pg');

const pool = new Pool({
  user: process.env.DB_USESR,
  password: process.env.DB_PASS,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME
});

/// Users

/**
 * Get a single user from the database given their email.
 * @param {String} email The email of the user.
 * @return {Promise<{}>} A promise to the user.
 */
const getUserWithEmail = function (email) {
  return pool
    .query(`SELECT * FROM users WHERE email = $1 LIMIT 1`, [email])
    .then((dat) => (dat.rowCount === 0 ? null : Promise.resolve(dat.rows[0])))
    .catch((err) => err.message)
};

/**
 * Get a single user from the database given their id.
 * @param {string} id The id of the user.
 * @return {Promise<{}>} A promise to the user.
 */
const getUserWithId = function (id) {
  return pool
    .query(`SELECT * FROM users WHERE id = $1 LIMIT 1`, [id])
    .then((data) => Promise.resolve(data.rows[0]))
    .catch((err) => err.message)
};

/**
 * Add a new user to the database.
 * @param {{name: string, password: string, email: string}} user
 * @return {Promise<{}>} A promise to the user.
 */
const addUser = function (user) {
  return pool
    .query(`INSERT INTO users (name, email, password)
      VALUES ($1, $2, $3)
      RETURNING *;`, [user.name, user.email, user.password])
    .then((data) => Promise.resolve(data.rows[0]))
    .catch((err) => err.message);
};

/// Reservations

/**
 * Get all reservations for a single user.
 * @param {string} guest_id The id of the user.
 * @return {Promise<[{}]>} A promise to the reservations.
 */
const getAllReservations = function (guest_id, limit = 10) {
  return pool
    .query(`SELECT properties.*, avg(property_reviews.rating) as average_rating
    FROM reservations
    JOIN properties ON reservations.property_id = properties.id
    JOIN property_reviews ON properties.id = property_reviews.property_id
    WHERE reservations.guest_id = $1
    GROUP BY properties.id, reservations.id
    ORDER BY reservations.start_date
    LIMIT $2;`, [guest_id, limit])
    .then(result => result.rows)
    .catch(err => err.message)
};

/// Properties

/**
 * Get all properties.
 * @param {{}} options An object containing query options.
 * @param {*} limit The number of results to return.
 * @return {Promise<[{}]>}  A promise to the properties.
 */
const getAllProperties = function (options, limit = 10) {
  // always include WHERE city ILIKE query
  // defaults to '' if options.city is undefined 
  const queryParams = [`%${options.city || ''}%`];
  let queryString = `
  SELECT properties.*, avg(property_reviews.rating) as average_rating
  FROM properties
  JOIN property_reviews ON properties.id = property_id
  WHERE city ILIKE $1`

  // Conditional statement for owner_id
  if (options.owner_id) {
    queryParams.push(options.owner_id);
    queryString += `
    AND owner_id = $${queryParams.length}
    ` 
  };

  // Conditional statements for cost filtering
  if (options.minimum_price_per_night && options.maximum_price_per_night) {
    queryParams.push(options.minimum_price_per_night * 100);
    queryParams.push(options.maximum_price_per_night * 100);

    queryString += `
    AND cost_per_night BETWEEN
    $${queryParams.length - 1} and $${queryParams.length}`;

  } else if (options.minimum_price_per_night) {
    queryParams.push(options.minimum_price_per_night * 100);

    queryString += `
    AND cost_per_night >= $${queryParams.length}`;

  } else if (options.maximum_price_per_night) {
    queryParams.push(options.maximum_price_per_night * 100);

    queryString += `
    AND cost_per_night <= $${queryParams.length}`;
  };
  
  // Mandatory query grouping
  queryString += `
  GROUP BY properties.id`;

  // Filter by average rating
  if (options.minimum_rating) {
    queryParams.push(options.minimum_rating)
    queryString += `
    HAVING avg(property_reviews.rating) > $${queryParams.length}
    `;
  };
  
  // Finalize with query limit
  queryParams.push(limit);
  queryString += `
  ORDER BY cost_per_night
  LIMIT $${queryParams.length};`;

  // 6
  return pool.query(queryString, queryParams).then((res) => res.rows);
};

/**
 * Add a property to the database
 * @param {{}} property An object containing all of the property details.
 * @return {Promise<{}>} A promise to the property.
 */
const addProperty = function (property) {
  const queryString = `
  INSERT INTO properties (
    owner_id, 
    title, 
    description, 
    thumbnail_photo_url, 
    cover_photo_url, 
    cost_per_night, 
    street, 
    city, 
    province, 
    post_code, 
    country, 
    parking_spaces, 
    number_of_bathrooms, 
    number_of_bedrooms)
  
  VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
  RETURNING *;
  `

  const queryParams = [
    property.owner_id, 
    property.title, 
    property.description, 
    property.thumbnail_photo_url, 
    property.cover_photo_url, 
    property.cost_per_night, 
    property.street, 
    property.city, 
    property.province, 
    property.post_code, 
    property.country, 
    property.parking_spaces, 
    property.number_of_bathrooms, 
    property.number_of_bedrooms
  ];

  return pool.query(queryString, queryParams).then((res) => res.rows);
};

module.exports = {
  getUserWithEmail,
  getUserWithId,
  addUser,
  getAllReservations,
  getAllProperties,
  addProperty,
};
