-- grant "read-only" privileges to nobody
CREATE ROLE nobody LOGIN;
GRANT USAGE on SCHEMA lis_germplasm TO nobody;
GRANT SELECT ON ALL TABLES IN SCHEMA lis_germplasm TO nobody;
ALTER DEFAULT PRIVILEGES IN SCHEMA lis_germplasm GRANT SELECT ON TABLES TO nobody;

-- grant "read-write" privileges to guest (in load container) for loading
-- Need user name / UID that eixsts in both db and load container
CREATE ROLE guest LOGIN;
GRANT USAGE on SCHEMA lis_germplasm TO guest;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA lis_germplasm TO guest;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA lis_germplasm TO guest;
