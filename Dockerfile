FROM python:3.8-alpine3.12

RUN apk add --no-cache py3-psycopg2
ENV PYTHONPATH=/usr/lib/python3.8/site-packages

WORKDIR /app

COPY requirements.txt .

RUN pip install --no-cache-dir -r requirements.txt

COPY . .

WORKDIR grin_app/static/grin_app/js/
RUN apk add --no-cache npm \
 && npm install \
 && apk del -r npm

WORKDIR /app

ENV PYTHONUNBUFFERED=1
USER daemon

EXPOSE 8000
