# Arranca el PostgreSQL portátil de CavaLocal (puerto 5432).
# Uso:  pwsh -File start-postgres.ps1   (o clic derecho > Ejecutar con PowerShell)
$pg = 'C:\Users\euger\pgsql\bin'
$data = 'C:\Users\euger\pgdata'
& "$pg\pg_ctl.exe" -D $data -l "$data\server.log" -o "-p 5432" -w start
& "$pg\pg_isready.exe" -h localhost -p 5432
