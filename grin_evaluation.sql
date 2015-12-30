ALTER TABLE lis_germplasm.legumes_grin_evaluation_data ADD accenumb text;

CREATE index legumes_grin_evaluation_data_full_accnumb
ON lis_germplasm.legumes_grin_evaluation_data (lower(accenumb));

CREATE index legumes_grin_evaluation_data_descr_name_idx
ON lis_germplasm.legumes_grin_evaluation_data (descriptor_name);

CREATE index legumes_grin_evaluation_data_taxon_idx
ON lis_germplasm.legumes_grin_evaluation_data (lower(taxon));

UPDATE lis_germplasm.legumes_grin_evaluation_data
SET accenumb = accession_prefix || ' ' || accession_number;
