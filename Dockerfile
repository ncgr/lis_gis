FROM postgis/postgis:17-3.5-alpine AS db
COPY ./docker-entrypoint-initdb.d/ /docker-entrypoint-initdb.d/

########################################

# limited to Python 3.9 due to django-nose
FROM python:3.9-alpine AS build

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

########################################

FROM build AS dev

RUN apk add --no-cache postgresql-client \
 && pip install --no-cache-dir 'Werkzeug==2.*'

WORKDIR /app

USER nobody
ENV PATH=/app/scripts:$PATH
CMD ["python3", "-u", "manage.py", "runserver_plus", "0.0.0.0:8000"]

EXPOSE 8000

########################################

FROM ghcr.io/nginxinc/nginx-unprivileged:1.27-alpine AS nginx

COPY ./nginx/ /etc/nginx/templates
COPY ./grin_app/static/ /usr/share/nginx/html/static/

########################################

FROM build AS prod

WORKDIR /app

COPY manage.py ./
COPY grin_app ./grin_app
COPY lis_germplasm ./lis_germplasm
COPY scripts ./scripts
# Allow socket directory to be accessed by "nobody" (gunicorn) and nginx (gid 101)
RUN mkdir -m 750 /run/gunicorn /app/data \
  && chown nobody:101 /run/gunicorn \
  && chown guest:nobody /app/data
ENV PATH=/app/scripts:$PATH
USER nobody
CMD ["gunicorn", "--bind", "unix:/run/gunicorn/gunicorn.sock", "lis_germplasm.wsgi:application"]

#VOLUME ["/run/gunicorn"]
