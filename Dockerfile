FROM alpine:3.10

RUN apk add --no-cache python2 py2-django py2-nose py2-psycopg2 py2-simplejson py2-six py2-pip
RUN apk add --no-cache gcc python2-dev musl-dev \
 && pip install --no-cache-dir django-angular django-appconf django-compressor django-extensions django-nose petl \
 && apk del -r gcc python2-dev musl-dev

WORKDIR /app

COPY . .

RUN wget -O grin_app/static/grin_app/js/angular-auto-focus.js \
            https://raw.githubusercontent.com/myplanet/angular-auto-focus/v1.0.4/angular-auto-focus.js

EXPOSE 8000
