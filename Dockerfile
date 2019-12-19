FROM alpine:3.10

RUN apk add --no-cache python3 py3-django py3-nose py3-psycopg2 py3-simplejson py3-pip
RUN apk add --no-cache gcc python3-dev musl-dev \
 && pip3 install --no-cache-dir django-angular django-appconf django-compressor django-extensions django-nose petl \
 && apk del -r gcc python3-dev musl-dev

WORKDIR /app

COPY . .

RUN wget -O grin_app/static/grin_app/js/angular-auto-focus.js \
            https://raw.githubusercontent.com/myplanet/angular-auto-focus/v1.0.4/angular-auto-focus.js

USER daemon

EXPOSE 8000
