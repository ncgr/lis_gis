FROM python:3.8-alpine3.12 AS build

RUN apk add --no-cache py3-psycopg2
ENV PYTHONPATH=/usr/lib/python3.8/site-packages

WORKDIR /app/grin_app/static/grin_app/js/
COPY grin_app/static/grin_app/js/package.json .
RUN apk add --no-cache npm \
 && npm install \
 && apk del -r npm

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

########################################

FROM build AS dev

RUN apk add --no-cache postgresql-client

WORKDIR /app

ENV PYTHONUNBUFFERED=1
CMD ["python3", "manage.py", "runserver", "0.0.0.0:8000"]

EXPOSE 8000

VOLUME ["/app/grin_app/static/grin_app/js/node_modules"]

########################################

FROM build AS prod

RUN pip install --no-cache-dir gunicorn==20.0.4

WORKDIR /app

COPY . .

USER daemon
CMD ["gunicorn", "--bind", "0.0.0.0:8000", "lis_germplasm.wsgi:application"]
