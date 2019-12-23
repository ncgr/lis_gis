FROM alpine:3.10

RUN apk add --no-cache python3 py3-django py3-nose py3-psycopg2 py3-simplejson py3-pip
RUN apk add --no-cache gcc python3-dev musl-dev \
 && pip3 install --no-cache-dir django-angular django-appconf django-compressor django-extensions django-nose petl \
 && apk del -r gcc python3-dev musl-dev
RUN apk add --no-cache npm

WORKDIR /app

COPY . .

WORKDIR static_collected/grin_app/js/
RUN npm install

WORKDIR /app
USER daemon

EXPOSE 8000
