-- grant "read-only" privileges to daemon
CREATE ROLE daemon LOGIN;
GRANT USAGE on SCHEMA lis_germplasm TO daemon;
GRANT SELECT ON ALL TABLES IN SCHEMA lis_germplasm TO daemon;
ALTER DEFAULT PRIVILEGES IN SCHEMA lis_germplasm GRANT SELECT ON TABLES TO daemon;
