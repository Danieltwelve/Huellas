import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GUIAS_REVISION_MOCK } from '../panel-revisor.data';

@Component({
  selector: 'app-guias-revision',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './guias-revision.component.html',
  styleUrls: ['./guias-revision.component.css'],
})
export class GuiasRevisionComponent {
  guias = GUIAS_REVISION_MOCK;
}
