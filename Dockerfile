FROM postgis/postgis:12-2.5-alpine AS db
RUN wget -O ./docker-entrypoint-initdb.d/lis_germplasm.sql.xz https://ars-usda.box.com/shared/static/ambc9t4xorieg8qd8e065x9r6dqtua20.xz
COPY ./docker-entrypoint-initdb.d/ /docker-entrypoint-initdb.d/

########################################

FROM python:3.9 AS build

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt requests  # CTC added as a cheat for now

########################################

FROM build AS dev

RUN pip install --no-cache-dir 'Werkzeug==2.*'

WORKDIR /app

USER nobody
ENV PYTHONUNBUFFERED=1
CMD ["python3", "manage.py", "runserver_plus", "0.0.0.0:8000"]

EXPOSE 8000

########################################

FROM nginx:1.22-alpine AS nginx

# remove "worker_processes auto;" & use default (1)
RUN sed -i'' '/^worker_processes/d' /etc/nginx/nginx.conf
COPY ./nginx/ /etc/nginx/templates
COPY ./grin_app/static/ /usr/share/nginx/html/static/

########################################

FROM build AS prod

WORKDIR /app

COPY manage.py ./
COPY grin_app ./grin_app
COPY lis_germplasm ./lis_germplasm
# Allow socket directory to be accessed by "nobody" (gunicorn) and nginx (gid 101)
RUN mkdir -m 750 /run/gunicorn && chown nobody:101 /run/gunicorn
USER nobody
CMD ["gunicorn", "--bind", "unix:/run/gunicorn/gunicorn.sock", "lis_germplasm.wsgi:application"]

VOLUME ["/run/gunicorn"]
