
create table peran(
	id serial primary key,
	nama_peran text
);

create table pengguna (
	id serial primary key,
	nama text,
	jenis_kelamin text,
	alamat text,
	nomor_telepon text,
	email text,
	peran INTEGER references peran (id)
	
);

create table status_surat(
	id serial primary key,
	status text
);

create table arsip_surat(
	id serial primary key,
	pengirim text,
	tanggal_kirim date,
	catatan text,
	status integer references status_surat(id),
	surat varchar
);
