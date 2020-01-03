FROM alpine:3.11

RUN apk add --no-cache \
  python3 \
  py3-django \
  py3-django-appconf \
  py3-gunicorn \
  py3-nose \
  py3-psycopg2 \
  py3-simplejson \
  py3-pip

RUN apk add --no-cache gcc python3-dev musl-dev \
 && pip3 install --no-cache-dir django-angular django-compressor django-extensions django-nose petl \
 && apk del -r gcc python3-dev musl-dev

WORKDIR /app

COPY . .

WORKDIR static_collected/grin_app/js/
RUN apk add --no-cache npm \
 && npm install \
 && apk del -r npm

WORKDIR /app

ENV PYTHONUNBUFFERED=1
USER daemon

EXPOSE 8000
