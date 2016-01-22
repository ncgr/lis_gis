ALTER TABLE lis_germplasm.legumes_grin_evaluation_data ADD accenumb text;

CREATE INDEX ON lis_germplasm.legumes_grin_evaluation_data (descriptor_name);
CREATE INDEX ON lis_germplasm.legumes_grin_evaluation_data (accenumb) ;

UPDATE lis_germplasm.legumes_grin_evaluation_data
SET accenumb = accession_prefix || ' ' || accession_number;

CREATE FUNCTION grin_evaluation_data_concat_accenumb() RETURNS trigger AS
  $concat_accenumb$
  BEGIN
      NEW.accenumb = NEW.accession_prefix || ' ' || NEW.accession_number;
      RETURN NEW;
  END
  $concat_accenumb$
LANGUAGE plpgsql
;

CREATE TRIGGER accenumb_trigger
BEFORE INSERT ON lis_germplasm.legumes_grin_evaluation_data
FOR EACH ROW EXECUTE PROCEDURE grin_evaluation_data_concat_accenumb()
;

CLUSTER lis_germplasm.legumes_grin_evaluation_data USING legumes_grin_evaluation_data_accenumb_idx;

