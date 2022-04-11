--
-- PostgreSQL database dump
--

SET statement_timeout = 0;
SET lock_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SET check_function_bodies = false;
SET client_min_messages = warning;

--
-- Name: lis_germplasm; Type: SCHEMA; Schema: -; Owner: www
--

CREATE SCHEMA lis_germplasm;



SET search_path = lis_germplasm, pg_catalog;

--
-- Name: grin_observation_type; Type: TYPE; Schema: lis_germplasm; Owner: www
--

CREATE TYPE grin_observation_type AS ENUM (
    'nominal',
    'numeric'
);



SET default_tablespace = '';

SET default_with_oids = false;

--
-- Name: grin_accession; Type: TABLE; Schema: lis_germplasm; Owner: www; Tablespace: 
--

CREATE TABLE grin_accession (
    germplasmDbId integer PRIMARY KEY,
    taxon text,
    taxon_fts tsvector,
    genus text,
    species text,
    speciesAuthority text,
    subtaxon text,
    subtaxonAuthority text,
    commonCropName text,
    instituteCode text,
    accessionNumber text,
    collectingNumber text,
    collectingInstitutes text,
    accessionNames text,
    acquisitionDate date,
    countryOfOrigin text,
    locationDescription text,
    elevation integer,
    collectingDate date,
    breedingInstitutes text,
    biologicalStatusOfAccessionCode integer,
    ancestralData text,
    acquisitionSourceCode integer,
    donorInstitute text,
    donorAccessionNumber text,
    safetyDuplicateInstitutes text,
    storageTypeCodes text,
    latitudeDecimal double precision,
    longitudeDecimal double precision,
    geographic_coord public.geography(Point,4326),
    remarks text,
    history text
);


--
-- Name: grin_evaluation_metadata; Type: TABLE; Schema: lis_germplasm; Owner: www; Tablespace: 
--

CREATE TABLE grin_evaluation_metadata (
    id SERIAL PRIMARY KEY,
    taxon text,
    observationVariableName text,
    obs_type grin_observation_type,
    obs_min double precision,
    obs_max double precision,
    obs_nominal_values text[]
);

--
-- Name: grin_evaluation_data_concat_accenumb(); Type: FUNCTION; Schema: lis_germplasm; Owner: www
--
/* FIXME: this is a minor compatibility stopgap. Instead of replicating this
 *        data, queries should be updated to retrieve it from grin_accession.
 */

CREATE FUNCTION grin_evaluation_data_concat_accenumb() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
  BEGIN
      SELECT accessionNumber, taxon, countryOfOrigin
        -- TODO: is countryOfOrigin
        INTO NEW.accessionNumber, NEW.taxon, NEW.countryOfOrigin
        FROM lis_germplasm.grin_accession
        WHERE lis_germplasm.grin_accession.germplasmDbId = NEW.germplasmDbId;
      RETURN NEW;
  END
  $$;


--
-- Name: legumes_grin_evaluation_data; Type: TABLE; Schema: lis_germplasm; Owner: www; Tablespace: 
--

CREATE TABLE legumes_grin_evaluation_data (
    observationDbId integer PRIMARY KEY,
    germplasmDbId integer NOT NULL,
    value character varying(64),
    observationVariableName character varying(64),
    -- plant_name character varying(255), /* FIXME */
    taxon character varying(64),
    countryOfOrigin character varying(255),
    additionalInfo text,
    accessionNumber text,
    FOREIGN KEY (germplasmDbId) REFERENCES grin_accession(germplasmDbId)
);



--
-- Name: grin_accession_accenumb_idx; Type: INDEX; Schema: lis_germplasm; Owner: www; Tablespace: 
--

CREATE UNIQUE INDEX grin_accession_accenumb_idx ON grin_accession USING btree (accessionNumber);


--
-- Name: grin_accession_geographic_coord_idx; Type: INDEX; Schema: lis_germplasm; Owner: www; Tablespace: 
--

CREATE INDEX grin_accession_geographic_coord_idx ON grin_accession USING gist (geographic_coord);


--
-- Name: grin_accession_lower_idx; Type: INDEX; Schema: lis_germplasm; Owner: www; Tablespace: 
--

CREATE INDEX grin_accession_lower_idx ON grin_accession USING btree (lower(species));


--
-- Name: grin_accession_lower_idx1; Type: INDEX; Schema: lis_germplasm; Owner: www; Tablespace: 
--

CREATE INDEX grin_accession_lower_idx1 ON grin_accession USING btree (lower(taxon));


--
-- Name: grin_accession_taxon_fts_idx; Type: INDEX; Schema: lis_germplasm; Owner: www; Tablespace: 
--

CREATE INDEX grin_accession_taxon_fts_idx ON grin_accession USING gin (taxon_fts);


--
-- Name: grin_evaluation_metadata_descriptor_name_idx; Type: INDEX; Schema: lis_germplasm; Owner: www; Tablespace: 
--

CREATE INDEX grin_evaluation_metadata_descriptor_name_idx ON grin_evaluation_metadata USING btree (observationVariableName);


--
-- Name: grin_evaluation_metadata_taxon_idx; Type: INDEX; Schema: lis_germplasm; Owner: www; Tablespace: 
--

CREATE INDEX grin_evaluation_metadata_taxon_idx ON grin_evaluation_metadata USING btree (taxon);


--
-- Name: legumes_grin_evaluation_data_accenumb_descriptor_name_idx; Type: INDEX; Schema: lis_germplasm; Owner: www; Tablespace: 
--

CREATE INDEX legumes_grin_evaluation_data_accenumb_descriptor_name_idx ON legumes_grin_evaluation_data USING btree (accessionNumber, observationVariableName);


--
-- Name: legumes_grin_evaluation_data_accenumb_idx; Type: INDEX; Schema: lis_germplasm; Owner: www; Tablespace: 
--

CREATE INDEX legumes_grin_evaluation_data_accenumb_idx ON legumes_grin_evaluation_data USING btree (accessionNumber);


--
-- Name: legumes_grin_evaluation_data_descr_name_idx; Type: INDEX; Schema: lis_germplasm; Owner: www; Tablespace: 
--

CREATE INDEX legumes_grin_evaluation_data_descr_name_idx ON legumes_grin_evaluation_data USING btree (observationVariableName);


--
-- Name: legumes_grin_evaluation_data_full_accnumb; Type: INDEX; Schema: lis_germplasm; Owner: www; Tablespace: 
--

CREATE INDEX legumes_grin_evaluation_data_full_accnumb ON legumes_grin_evaluation_data USING btree (lower(accessionNumber));


--
-- Name: legumes_grin_evaluation_data_taxon_idx; Type: INDEX; Schema: lis_germplasm; Owner: www; Tablespace: 
--

CREATE INDEX legumes_grin_evaluation_data_taxon_idx ON legumes_grin_evaluation_data USING btree (lower((taxon)::text));


--
-- Name: accenumb_trigger; Type: TRIGGER; Schema: lis_germplasm; Owner: www
--

CREATE TRIGGER accenumb_trigger BEFORE INSERT ON legumes_grin_evaluation_data FOR EACH ROW EXECUTE PROCEDURE grin_evaluation_data_concat_accenumb();
