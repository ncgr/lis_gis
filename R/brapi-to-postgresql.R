#!/usr/bin/env Rscript
# --------------------------------------------------------------
library(jsonlite)
library(DBI)
#library(RPostgres) # https://rpostgres.r-dbi.org
library(sf) # for geographic_coord
# --------------------------------------------------------------
# Utility functions

# Convert decimal latitude to 'ddmmssH'
# where dd = degrees, mm = minutes, ss = seconds, H = hemisphere
to_latitude_text <- function(latdec) {
  if (is.na(latdec)) return("")
  abs_latdec <- abs(latdec)
  dd <- as.integer(abs_latdec)
  ssdec <- as.integer(3600*(abs_latdec - dd))
  mm <- ssdec %/% 60
  ss <- ssdec %% 60
  hem <- ifelse(latdec > 0, "N", "S")
  sprintf("%02d%02d%02d%s", dd, mm, ss, hem)
}

# Convert decimal longitude to 'dddmmssH'
# where ddd = degrees, mm = minutes, ss = seconds, H = hemisphere
to_longitude_text <- function(longdec) {
  if (is.na(longdec)) return("")
  abs_longdec <- abs(longdec)
  dd <- as.integer(abs_longdec)
  ssdec <- as.integer(3600*(abs_longdec - dd))
  mm <- ssdec %/% 60
  ss <- ssdec %% 60
  hem <- ifelse(longdec > 0, "E", "W")
  sprintf("%03d%02d%02d%s", dd, mm, ss, hem)
}

# Convert decimal (longitude, latitude) to public.geography(Point,4326)
# https://gis.stackexchange.com/questions/145007/creating-geometry-from-lat-lon-in-table-using-postgis
to_geographic_coord <- function(longdec, latdec) {
  st_point(c(longdec, latdec)) |>
    st_sfc(crs = 4326) |>
    st_as_binary(EWKB = TRUE, hex = TRUE) |>
    toupper()
}
# Examples
# to_geographic_coord(0, 0)
# "0101000020E610000000000000000000000000000000000000"
# to_geographic_coord(-5.16666667, 33.51666667)
# "0101000020E6100000D2EEE3AAAAAA14C0A74A292222C24040"

# --------------------------------------------------------------

# Download BrAPI data from brapi_url, pageSize results at a time,
# and store in a PostgreSQL database associated with connection conn
# (accession table = table_name )
brapi_to_sql_all <- function(brapi_url, conn, table_name, pageSize = 1000) {
  # Determine number of rows and pages
  json <- fromJSON(brapi_url)
  num_rows <- json$metadata$pagination$totalCount
  num_pages <- json$metadata$pagination$totalPages

  # Download and combine each page (assumes that database PGDATABASE exists)
  for (p in 1:num_pages) {
    # Download data from the BrAPI endpoint
    json <- fromJSON(sprintf("%s&page=%d&pageSize=%d", brapi_url, p - 1, pageSize))
    data <- json$result[[1]]
    # extract latitude and longitude
    lat_long <- apply(data, 1, function(d) {
      ll <- d$germplasmOrigin$coordinates$geometry$coordinates[[1]]
      if (length(ll) == 0) return(rep("0", 2))
      ll
    })
    lat_long <- matrix(lat_long, ncol = 2, byrow = TRUE)
    # extract taxon id
    taxonId <- apply(data, 1, function(d) {
      as.integer(d$taxonIds$taxonId)
    })

    # Create data frame (results) whose columns match the database table,
    # using default values for those that do not exist in the BrAPI data
    latdec <- as.numeric(lat_long[, 2])
    longdec <- as.numeric(lat_long[, 1])
    results <- data.frame(
      acckey = data$germplasmDbId,
      taxon = sprintf("%s %s", data$genus, data$species),
      is_legume = TRUE,
      genus = data$genus,
      species = data$species,
      spauthor = data$speciesAuthority,
      subtaxa = data$subtaxa,
      subtauthor = data$speciesAuthority,
      cropname = data$commonCropName,
      avail = "",
      instcode = data$instituteCode,
      accenumb = trimws(data$accessionNumber),
      collnumb = "",
      collcode = "",
      taxno = taxonId,
      accename = "",
      acqdate = as.Date(substring(data$acquisitionDate, 1, 10)),
      origcty = data$countryOfOriginCode,
      collsite = data$seedSourceDescription,
      latitude = sapply(latdec, to_latitude_text),
      longitude = sapply(longdec, to_longitude_text),
      elevation = 0,
      colldate = as.Date(substring(data$acquisitionDate, 1, 10)),
      bredcode = "",
      sampstat = 0,
      ancest = "",
      collsrc = 0,
      donorcode = "",
      donornumb = "",
      othernumb = "",
      duplsite = "",
      storage = "",
      latdec = latdec,
      longdec = longdec,
      geographic_coord = mapply(to_geographic_coord, longdec, latdec), # type is public.geography(Point,4326)
      remarks = "",
      history = "",
      released = ""
    )

    # Append the data to the database
    dbWriteTable(conn, table_name, results, append = TRUE, row.names = FALSE)
    print(paste("Page", p, "of", num_pages))
  }
}

# --------------------------------------------------------------

# Legume genera
genera <- c("Apios", "Arachis", "Cajanus", "Chamaecrista", "Cicer", "Glycine", "Lens",
  "Lotus", "Lupinus", "Medicago", "Phaseolus", "Pisum", "Trifolium", "Vicia", "Vigna")

# The code below repopulates your database's accession table,
# using data from a BrAPI endpoint.
# First go into psql and remove all existing rows from the accession table:
# DELETE FROM lis_germplasm.grin_accession;

# Loop over all genera, the genus goes in brapi_url
for (g in genera) {
  print(g)
  brapi_url <- sprintf("https://npgsweb.ars-grin.gov/gringlobal/brapi/v2/germplasm?genus=%s", g)
  # use SQL() to escape hidden table names
  conn <- dbConnect(RPostgres::Postgres(), host = Sys.getenv("PGHOST"), dbname = Sys.getenv("PGDATABASE"))
  brapi_to_sql_all(brapi_url,
    conn,
    table_name = SQL('"lis_germplasm"."grin_accession"'),
  )
  # Done
  dbSendQuery(conn, sprintf("UPDATE lis_germplasm.grin_accession SET taxon_fts = to_tsvector('english', coalesce(taxon,''))"))
  dbDisconnect(conn)
}

# To check the new row count,
# SELECT COUNT(*) FROM lis_germplasm.grin_accession;

# To dump the (compressed) database,
# pg_dump lis_germplasm --no-owner --no-privileges --compress=9 > lis_germplasm.sql.gz

# Then copy or move the compressed dump to docker-entrypoint-initdb.d/
# and rebuild your lis_gis Docker container.

# --------------------------------------------------------------
