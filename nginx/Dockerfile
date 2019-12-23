FROM nginx:1.17-alpine

COPY ./nginx/nginx.conf /etc/nginx/conf.d/default.conf
COPY ./grin_app/static/ /usr/share/nginx/html/static/

RUN wget -O /usr/share/nginx/html/static/grin_app/js/angular-auto-focus.js \
            https://raw.githubusercontent.com/myplanet/angular-auto-focus/v1.0.4/angular-auto-focus.js
