ALTER TABLE lis_germplasm.legumes_grin_evaluation_data ADD accenumb text;

CREATE index legumes_grin_evaluation_data_full_accnumb
ON lis_germplasm.legumes_grin_evaluation_data (lower(accenumb));

CREATE index legumes_grin_evaluation_data_descr_name_idx
ON lis_germplasm.legumes_grin_evaluation_data (descriptor_name);

CREATE index legumes_grin_evaluation_data_taxon_idx
ON lis_germplasm.legumes_grin_evaluation_data (lower(taxon));

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
