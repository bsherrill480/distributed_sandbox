CREATE TABLE rides(
  resort_id int,
  day int,
  skier_id int,
  lift_id int,
  time int
);

CREATE INDEX skier_id_idx ON rides(skier_id);
