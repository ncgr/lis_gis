FROM nginx:1.17-alpine

COPY ./nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=lis_gis-django:1 /app/grin_app/static/ /usr/share/nginx/html/static/
