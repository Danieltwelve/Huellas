import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

interface Edicion {
id: number;
titulo: string;
fecha: string;
anio: string;
descripcion: string;
autores: number;
articulos: number;
pdf: string;
}

interface Articulo {
id: number;
titulo: string;
resumen: string;
archivo: string;
}

@Component({
  selector: 'app-actual',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './actual.component.html',
  styleUrls: ['./actual.component.css']
})
export class ActualComponent {

busqueda = '';
anioFiltro = '';
edicionSeleccionada: Edicion | null = null;
articulosDeEdicion: Articulo[] = [];

anios = ['2025','2024','2023','2022','2021','2020','2019','2018','2017','2016','2015','2014'];

ediciones: Edicion[] = [

{
id:22,
titulo:'Huellas Revista No. 22, Vol. 11, Núm. 2 (2025)',
fecha:'2025',
anio:'2025',
descripcion:'Investigaciones recientes en inteligencia artificial y ciencia de datos',
autores:12,
articulos:14,
pdf:'assets/pdfs/vol22.pdf'
},

{
id:21,
titulo:'Revista Huellas No. 21, Vol. 11, Núm. 1 (2025)',
fecha:'2025',
anio:'2025',
descripcion:'Artículos sobre innovación tecnológica y desarrollo sostenible',
autores:10,
articulos:12,
pdf:'assets/pdfs/vol21.pdf'
},

{
id:20,
titulo:'Revista Huellas No. 20, Vol. 10, Núm. 2 (2024)',
fecha:'2024',
anio:'2024',
descripcion:'Estudios interdisciplinarios en ciencias sociales',
autores:9,
articulos:11,
pdf:'assets/pdfs/vol20.pdf'
},

{
id:19,
titulo:'Huellas Revista No. 19, Vol. 10, Núm. 1 (2024)',
fecha:'2024',
anio:'2024',
descripcion:'Investigaciones sobre transformación digital',
autores:11,
articulos:13,
pdf:'assets/pdfs/vol19.pdf'
},

{
id:18,
titulo:'Huellas Revista No. 18, Vol. 9, Núm. 2 (2023)',
fecha:'2023',
anio:'2023',
descripcion:'Estudios en educación y tecnología',
autores:8,
articulos:10,
pdf:'assets/pdfs/vol18.pdf'
},

{
id:17,
titulo:'REVISTA HUELLAS No. 17, Vol. 9, Núm. 1 (2023)',
fecha:'2023',
anio:'2023',
descripcion:'Investigaciones en ingeniería y computación',
autores:7,
articulos:9,
pdf:'assets/pdfs/vol17.pdf'
},

{
id:16,
titulo:'Revista Huellas No. 16, Vol. 8, Núm. 2 (2022)',
fecha:'2022',
anio:'2022',
descripcion:'Artículos sobre desarrollo sostenible',
autores:9,
articulos:11,
pdf:'assets/pdfs/vol16.pdf'
},

{
id:15,
titulo:'Huellas Revista No. 15, Vol. 8, Núm. 1 (2022)',
fecha:'2022',
anio:'2022',
descripcion:'Investigaciones interdisciplinarias',
autores:10,
articulos:12,
pdf:'assets/pdfs/vol15.pdf'
},

{
id:14,
titulo:'Huellas Revista No. 14, Vol. 7, Núm. 2 (2021)',
fecha:'2021',
anio:'2021',
descripcion:'Ciencia aplicada y tecnología',
autores:8,
articulos:10,
pdf:'assets/pdfs/vol14.pdf'
},

{
id:13,
titulo:'Huellas Revista No. 13, Vol. 7, Núm. 1 (2021)',
fecha:'2021',
anio:'2021',
descripcion:'Estudios en ciencias sociales',
autores:7,
articulos:9,
pdf:'assets/pdfs/vol13.pdf'
},

{
id:12,
titulo:'Huellas Revista No. 12, Vol. 6, Núm. 2 (2020)',
fecha:'2020',
anio:'2020',
descripcion:'Investigaciones académicas multidisciplinarias',
autores:9,
articulos:11,
pdf:'assets/pdfs/vol12.pdf'
},

{
id:11,
titulo:'Huellas Revista No. 11, Vol. 6, Núm. 1 (2019)',
fecha:'2019',
anio:'2019',
descripcion:'Publicaciones en innovación científica',
autores:8,
articulos:9,
pdf:'assets/pdfs/vol11.pdf'
},

{
id:10,
titulo:'Huellas Revista No. 10, Vol. 5, Núm. 2 (2018)',
fecha:'2018',
anio:'2018',
descripcion:'Investigaciones tecnológicas',
autores:7,
articulos:8,
pdf:'assets/pdfs/vol10.pdf'
},

{
id:9,
titulo:'Sergio Elías Ortiz. No. 5, Vol. 5, Núm. 1 (2018)',
fecha:'2018',
anio:'2018',
descripcion:'Estudios interdisciplinarios',
autores:6,
articulos:7,
pdf:'assets/pdfs/vol9.pdf'
},

{
id:8,
titulo:'Alonso Mafla Bilbao. No. 4, Vol. 4, Núm. 2 (2017)',
fecha:'2017',
anio:'2017',
descripcion:'Investigaciones académicas',
autores:5,
articulos:6,
pdf:'assets/pdfs/vol8.pdf'
},

{
id:7,
titulo:'La lectura hace al hombre completo, la conversación lo hace ágil, la escritura lo hace preciso. No. 4, Vol. 4, Núm. 1 (2017)',
fecha:'2017',
anio:'2017',
descripcion:'Investigaciones científicas',
autores:6,
articulos:7,
pdf:'assets/pdfs/vol7.pdf'
},

{
id:6,
titulo:'Heraldo Romero Sánchez. No. 3, Vol. 3, Núm. 2 (2016)',
fecha:'2016',
anio:'2016',
descripcion:'Publicaciones tecnológicas',
autores:5,
articulos:6,
pdf:'assets/pdfs/vol6.pdf'
},

{
id:5,
titulo:'Las voces de los maestros en formación. No. 3, Vol. 3, Núm. 1 (2016)',
fecha:'2016',
anio:'2016',
descripcion:'Ciencia y desarrollo',
autores:5,
articulos:6,
pdf:'assets/pdfs/vol5.pdf'
},

{
id:4,
titulo:'Caminando entre líneas de texto, despertar el sentido de la escritura. No. 2, Vol. 2, Núm. 2 (2015)',
fecha:'2015',
anio:'2015',
descripcion:'Investigaciones interdisciplinarias',
autores:4,
articulos:5,
pdf:'assets/pdfs/vol4.pdf'
},

{
id:3,
titulo:'Maestros que dejan huellas. No. 2, Vol. 2, Núm. 1 (2015)',
fecha:'2015',
anio:'2015',
descripcion:'Artículos académicos',
autores:4,
articulos:5,
pdf:'assets/pdfs/vol3.pdf'
},

{
id:2,
titulo:'Forjando el camino para las nuevas generaciones. No. 1, Vol. 1, Núm. 2 (2014)',
fecha:'2014',
anio:'2014',
descripcion:'Publicaciones científicas',
autores:3,
articulos:4,
pdf:'assets/pdfs/vol2.pdf'
},

{
id:1,
titulo:'La lectura y la escritura, una oportunidad para la transformación social. No. 1, Vol. 1, Núm. 1 (2014)',
fecha:'2014',
anio:'2014',
descripcion:'Primera edición de la revista HUELLAS',
autores:3,
articulos:4,
pdf:'assets/pdfs/vol1.pdf'
}

].sort((a,b)=>b.id-a.id)
 .map(edicion => ({ ...edicion, articulos: 10 }));

verEdicion(edicion: Edicion){
this.edicionSeleccionada = edicion;
this.articulosDeEdicion = this.crearArticulos(edicion.id);
}

volverAListado(){
this.edicionSeleccionada = null;
this.articulosDeEdicion = [];
}

limpiarFiltros(){
this.busqueda = '';
this.anioFiltro = '';
}

private crearArticulos(edicionId: number): Articulo[] {
return Array.from({ length: 10 }, (_, indice) => {
const numero = indice + 1;
const numeroConCeros = String(numero).padStart(2, '0');

return {
id: numero,
titulo: `Artículo ${numero} - Edición ${edicionId}`,
resumen: `Resumen del artículo ${numero} correspondiente a la edición ${edicionId}.`,
archivo: `assets/articulos/edicion-${edicionId}/articulo-${numeroConCeros}.pdf`
};
});
}

edicionesFiltradas(){

return this.ediciones.filter(e=>{

const coincideBusqueda = e.titulo.toLowerCase().includes(this.busqueda.toLowerCase());

const coincideAnio = this.anioFiltro ? e.anio === this.anioFiltro : true;

return coincideBusqueda && coincideAnio;

});

}

}