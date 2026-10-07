import { Component, inject } from '@angular/core';
import { Tooltip } from 'primeng/tooltip';

import { I18nService } from '../../../core/i18n';
import { FavoriteLocation } from '../../weather/weather.model';
import { WeatherService } from '../../weather/weather.service';

@Component({
  selector: 'app-favorites-list',
  imports: [Tooltip],
  templateUrl: './favorites-list.html',
  styleUrl: './favorites-list.scss',
})
export class FavoritesListComponent {
  readonly weatherService = inject(WeatherService);
  readonly i18n = inject(I18nService);

  selectLocation(query: string): void {
    this.weatherService.fetchWeather(query);
  }

  removeFavorite(e: Event, query: string): void {
    e.stopPropagation();
    this.weatherService.removeFavorite(query);
  }
}
