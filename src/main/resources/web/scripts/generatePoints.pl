#!/usr/bin/perl

use strict;
use warnings;


open(FILE, ">scriptInsert.sql") || die "cannot open file. ";

for (my $count = 0 ; $count < 40000 ; $count++){
	
	#lat [20;50]
	#long [0;10]
	
	my $lat = rand(30)+20;
	my $long = rand(10);
	
	
	print FILE "insert Geo values ('$count', GeomFromText('POINT($lat $long)'));\n";
	
	


} 


close FILE;