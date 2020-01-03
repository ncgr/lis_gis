# https://github.com/docker-library/postgres/issues/319

FROM mdillon/postgis:11-alpine AS load
COPY ./docker-entrypoint-initdb.d/ /docker-entrypoint-initdb.d/
ENV PGDATA=/pgdata
RUN docker-entrypoint.sh --help

FROM mdillon/postgis:11-alpine
COPY --from=load /pgdata /var/lib/postgresql/data/
