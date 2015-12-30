alter table lis_germplasm.legumes_grin_evaluation_data add accenumb text;

create index full_accnumb on lis_germplasm.legumes_grin_evaluation_data (lower(accenumb));

update lis_germplasm.legumes_grin_evaluation_data
set accenumb = accession_prefix || ' ' || accession_number;

create index descr_name_idx on lis_germplasm.legumes_grin_evaluation_data (descriptor_name);
