CREATE TYPE grin_observation_type AS ENUM ('nominal', 'numeric');

CREATE TABLE lis_germplasm.grin_evaluation_metadata (
       id SERIAL PRIMARY KEY,
       taxon TEXT,
       descriptor_name TEXT,
       obs_type grin_observation_type,
       obs_min FLOAT,
       obs_max FLOAT,
       obs_nominal_values text ARRAY
);

CREATE INDEX ON lis_germplasm.grin_evaluation_metadata (taxon);
CREATE INDEX ON lis_germplasm.grin_evaluation_metadata (descriptor_name);
