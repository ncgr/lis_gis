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



--
-- Name: grin_evaluation_data_concat_accenumb(); Type: FUNCTION; Schema: lis_germplasm; Owner: www
--

CREATE FUNCTION grin_evaluation_data_concat_accenumb() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
  BEGIN
      NEW.accenumb = NEW.accession_prefix || ' ' || NEW.accession_number;
      RETURN NEW;
  END
  $$;



SET default_tablespace = '';

SET default_with_oids = false;

--
-- Name: grin_accession; Type: TABLE; Schema: lis_germplasm; Owner: www; Tablespace: 
--

CREATE TABLE grin_accession (
    gid integer NOT NULL,
    taxon text,
    taxon_fts tsvector,
    genus text,
    species text,
    spauthor text,
    subtaxa text,
    subtauthor text,
    cropname text,
    instcode text,
    accenumb text,
    acckey integer,
    collnumb text,
    collcode text,
    accename text,
    acqdate date,
    origcty text,
    collsite text,
    elevation integer,
    colldate date,
    bredcode text,
    sampstat integer,
    ancest text,
    collsrc integer,
    donorcode text,
    donornumb text,
    duplsite text,
    storage text,
    latdec double precision,
    longdec double precision,
    geographic_coord public.geography(Point,4326),
    remarks text,
    history text
);



--
-- Name: grin_accession_gid_seq; Type: SEQUENCE; Schema: lis_germplasm; Owner: www
--

CREATE SEQUENCE grin_accession_gid_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;



--
-- Name: grin_accession_gid_seq; Type: SEQUENCE OWNED BY; Schema: lis_germplasm; Owner: www
--

ALTER SEQUENCE grin_accession_gid_seq OWNED BY grin_accession.gid;


--
-- Name: grin_evaluation_metadata; Type: TABLE; Schema: lis_germplasm; Owner: www; Tablespace: 
--

CREATE TABLE grin_evaluation_metadata (
    id integer NOT NULL,
    taxon text,
    descriptor_name text,
    obs_type grin_observation_type,
    obs_min double precision,
    obs_max double precision,
    obs_nominal_values text[]
);



--
-- Name: grin_evaluation_metadata_id_seq; Type: SEQUENCE; Schema: lis_germplasm; Owner: www
--

CREATE SEQUENCE grin_evaluation_metadata_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;



--
-- Name: grin_evaluation_metadata_id_seq; Type: SEQUENCE OWNED BY; Schema: lis_germplasm; Owner: www
--

ALTER SEQUENCE grin_evaluation_metadata_id_seq OWNED BY grin_evaluation_metadata.id;


--
-- Name: legumes_grin_evaluation_data; Type: TABLE; Schema: lis_germplasm; Owner: www; Tablespace: 
--

CREATE TABLE legumes_grin_evaluation_data (
    accession_prefix character varying(16),
    accession_number character varying(16),
    observation_value character varying(64),
    descriptor_name character varying(64),
    method_name character varying(255),
    accession_surfix character varying(255),
    plant_name character varying(255),
    taxon character varying(64),
    origin character varying(255),
    original_value character varying(64),
    frequency character varying(16),
    low character varying(16),
    hign character varying(16),
    mean character varying(16),
    sdev character varying(16),
    ssize character varying(16),
    inventory_prefix character varying(16),
    inventory_number character varying(16),
    inventory_suffix character varying(64),
    accession_comment text,
    accenumb text
);



--
-- Name: gid; Type: DEFAULT; Schema: lis_germplasm; Owner: www
--

ALTER TABLE ONLY grin_accession ALTER COLUMN gid SET DEFAULT nextval('grin_accession_gid_seq'::regclass);


--
-- Name: id; Type: DEFAULT; Schema: lis_germplasm; Owner: www
--

ALTER TABLE ONLY grin_evaluation_metadata ALTER COLUMN id SET DEFAULT nextval('grin_evaluation_metadata_id_seq'::regclass);


--
-- Name: grin_accession_pkey; Type: CONSTRAINT; Schema: lis_germplasm; Owner: www; Tablespace: 
--

ALTER TABLE ONLY grin_accession
    ADD CONSTRAINT grin_accession_pkey PRIMARY KEY (gid);


--
-- Name: grin_evaluation_metadata_pkey; Type: CONSTRAINT; Schema: lis_germplasm; Owner: www; Tablespace: 
--

ALTER TABLE ONLY grin_evaluation_metadata
    ADD CONSTRAINT grin_evaluation_metadata_pkey PRIMARY KEY (id);


--
-- Name: grin_accession_accenumb_idx; Type: INDEX; Schema: lis_germplasm; Owner: www; Tablespace: 
--

CREATE UNIQUE INDEX grin_accession_accenumb_idx ON grin_accession USING btree (accenumb);


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

CREATE INDEX grin_evaluation_metadata_descriptor_name_idx ON grin_evaluation_metadata USING btree (descriptor_name);


--
-- Name: grin_evaluation_metadata_taxon_idx; Type: INDEX; Schema: lis_germplasm; Owner: www; Tablespace: 
--

CREATE INDEX grin_evaluation_metadata_taxon_idx ON grin_evaluation_metadata USING btree (taxon);


--
-- Name: legumes_grin_evaluation_data_accenumb_descriptor_name_idx; Type: INDEX; Schema: lis_germplasm; Owner: www; Tablespace: 
--

CREATE INDEX legumes_grin_evaluation_data_accenumb_descriptor_name_idx ON legumes_grin_evaluation_data USING btree (accenumb, descriptor_name);


--
-- Name: legumes_grin_evaluation_data_accenumb_idx; Type: INDEX; Schema: lis_germplasm; Owner: www; Tablespace: 
--

CREATE INDEX legumes_grin_evaluation_data_accenumb_idx ON legumes_grin_evaluation_data USING btree (accenumb);


--
-- Name: legumes_grin_evaluation_data_accession_number_idx; Type: INDEX; Schema: lis_germplasm; Owner: www; Tablespace: 
--

CREATE INDEX legumes_grin_evaluation_data_accession_number_idx ON legumes_grin_evaluation_data USING btree (accession_number);


--
-- Name: legumes_grin_evaluation_data_accession_prefix_idx; Type: INDEX; Schema: lis_germplasm; Owner: www; Tablespace: 
--

CREATE INDEX legumes_grin_evaluation_data_accession_prefix_idx ON legumes_grin_evaluation_data USING btree (accession_prefix);


--
-- Name: legumes_grin_evaluation_data_descr_name_idx; Type: INDEX; Schema: lis_germplasm; Owner: www; Tablespace: 
--

CREATE INDEX legumes_grin_evaluation_data_descr_name_idx ON legumes_grin_evaluation_data USING btree (descriptor_name);


--
-- Name: legumes_grin_evaluation_data_full_accnumb; Type: INDEX; Schema: lis_germplasm; Owner: www; Tablespace: 
--

CREATE INDEX legumes_grin_evaluation_data_full_accnumb ON legumes_grin_evaluation_data USING btree (lower(accenumb));


--
-- Name: legumes_grin_evaluation_data_taxon_idx; Type: INDEX; Schema: lis_germplasm; Owner: www; Tablespace: 
--

CREATE INDEX legumes_grin_evaluation_data_taxon_idx ON legumes_grin_evaluation_data USING btree (lower((taxon)::text));


--
-- Name: accenumb_trigger; Type: TRIGGER; Schema: lis_germplasm; Owner: www
--

CREATE TRIGGER accenumb_trigger BEFORE INSERT ON legumes_grin_evaluation_data FOR EACH ROW EXECUTE PROCEDURE grin_evaluation_data_concat_accenumb();
