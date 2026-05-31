Place the PDF files for each edition here.

Expected structure:
- edicion-1/
  - articulo-01.pdf
  - articulo-02.pdf
  - articulo-03.pdf
  - articulo-04.pdf
  - articulo-05.pdf
  - articulo-06.pdf
  - articulo-07.pdf
  - articulo-08.pdf
  - articulo-09.pdf
  - articulo-10.pdf
- edicion-2/
  - articulo-01.pdf
  - articulo-02.pdf
  - articulo-03.pdf
  - articulo-04.pdf
  - articulo-05.pdf
  - articulo-06.pdf
  - articulo-07.pdf
  - articulo-08.pdf
  - articulo-09.pdf
  - articulo-10.pdf

Repeat the same pattern up to edicion-22/.

The frontend reads the files from:
assets/articulos/edicion-<id>/articulo-XX.pdf

Replace <id> with the edition number and XX with 01 to 10.
