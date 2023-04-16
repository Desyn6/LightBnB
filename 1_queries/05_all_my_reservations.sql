SELECT reservations.id, properties.title, properties.cost_per_night, reservations.start_date, avg(rating)
  FROM property_reviews
  JOIN properties ON properties.id = property_reviews.property_id
  JOIN reservations ON reservations.id = reservation_id
  JOIN users ON users.id = property_reviews.guest_id
  WHERE users.id = 4
  GROUP BY reservations.id, properties.title, properties.cost_per_night
  ORDER BY start_date
  LIMIT 10;