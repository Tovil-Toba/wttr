import { Component, computed, input } from '@angular/core';

export type WeatherConditionType =
  | 'sunny'
  | 'clear-night'
  | 'partly-cloudy-day'
  | 'partly-cloudy-night'
  | 'cloudy'
  | 'overcast'
  | 'drizzle'
  | 'rain'
  | 'heavy-rain'
  | 'snow'
  | 'blizzard'
  | 'sleet'
  | 'thunder'
  | 'wind'
  | 'fog';
export type WeatherIconSize = 'sm' | 'md' | 'lg' | 'xl';

@Component({
  selector: 'app-weather-icon',
  imports: [],
  templateUrl: './weather-icon.html',
  styleUrl: './weather-icon.scss',
})
export class WeatherIconComponent {
  condition = input.required<WeatherConditionType>();
  size = input<WeatherIconSize>('md');
  animated = input<boolean>(true);

  readonly sizeClass = computed(() => {
    switch (this.size()) {
      case 'sm':
        return 'w-5 h-5';
      case 'lg':
        return 'w-12 h-12';
      case 'xl':
        return 'w-20 h-20 sm:w-24 sm:h-24';
      case 'md':
      default:
        return 'w-8 h-8';
    }
  });
}
