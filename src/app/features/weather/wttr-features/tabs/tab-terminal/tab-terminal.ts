import { Component, computed, inject, input, output, signal } from '@angular/core';

import { I18nService } from '../../../../../core/i18n';
import { LoaderComponent } from '../../../../../shared/components/loader/loader';
import { WeatherService } from '../../../weather.service';

@Component({
  selector: 'app-tab-terminal',
  imports: [LoaderComponent],
  templateUrl: './tab-terminal.html',
})
export class TabTerminalComponent {
  readonly weatherService = inject(WeatherService);
  readonly i18n = inject(I18nService);

  query = input.required<string>();
  isLoading = input<boolean>(false);
  terminalOutput = input<string>('');
  loadingSeconds = input<number>(0);

  retry = output<void>();
  copyCommand = output<string>();

  copied = signal<boolean>(false);

  readonly curlCommand = computed(() => {
    return `curl 'wttr.in/${encodeURIComponent(this.query())}?lang=${this.weatherService.currentLang()}'`;
  });

  onCopy(): void {
    this.copied.set(true);
    this.copyCommand.emit(this.curlCommand());
    setTimeout(() => this.copied.set(false), 2000);
  }
}
