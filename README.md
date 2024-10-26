# lis_gis
Map viewer for and search interface for USDA/GRIN germplasm accessions and traits. See http://legumeinfo.org/germplasm/map for a live demo.
server requirements
* Python >= 3.5.x
* Django
* PostgreSQL and PostGIS

## Docker quick start

Docker can be used to start Django and Postgres (with an empty database):

```
docker compose up --wait --build
```

Point your browser to http://localhost:8000/

The lis_gis git working tree is bind-mounted at /app in the container, so changes to source files will be immediatey reflected in the container.

### Running Unit Tests

After building container images & running containers with `docker-compose up --build`, Django unit tests can be executed thus:

```
docker compose exec web python3 manage.py test
```

### Loading your own data (from postgres dump)

To substitute your own (PostGIS 2.5) schema, first dump the database to an SQL script:

```
pg_dump --no-owner --no-privileges --schema=<SCHEMA_NAME> --compress=9 > z-SCHEMA_NAME.sql.gz

```

Move the .sql.gz file to ./postgres/docker-entrypoint-initdb.d/ before executing `docker-compose up --build`.
The name of the file does not matter, as long as the extension is `*.sql.gz`, `*.sql.xz`, or `*.sql`, and as long as it lexicographically sorts after the `/docker-entrypoint-initdb.d/10_postgis.sh` script from the container image, which must be executed first.

**Example:** A database dump with accession data acquired from a BrAPI endpoint, using the R script `R/brapi-to-postgresql.R`,  lives at
```
/falafel/svengato/brapi-to-postgresql/lis_germplasm.sql.gz
```
Copy `lis_germplasm.sql.gz` to your `docker-entrypoint-initdb.d/` subdirectory, then build the container as described above in **Docker quick start**.

### Loading data from GRIN Global

Assuming `docker compose up --wait` has already been executed:

```
docker compose run --rm load
```

### Production Docker Compose

lis_gis can be built & deployed on a remote node (after setting DOCKER_HOST or docker context, and editing `prod.env`) thus:

```
docker compose --env-file prod.env up --wait --build
```

## Unit tests using django_nose


```./manage.py test```

This command will run Nose test, first populating the test db with subset of the legume accessions. All of views.py is covered. Note: Client side javascript code is not yet covered by this test suite. TODO: implement Selenium or something to test the angular-js application itself.

