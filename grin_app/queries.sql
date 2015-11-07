-- ST_Contains(geometry geomA, geometry geomB)
select collsite, latdec, longdec, ST_AsText(geographic_coord::geometry)
from genus where
ST_Contains(
  ST_MakeEnvelope(-100,36,-79,44,4326),
  geographic_coord::geometry
  );
  

