import { Component, computed, input, output } from '@angular/core';

@Component({
  selector: 'app-loader',
  imports: [],
  templateUrl: './loader.html',
  styleUrl: './loader.scss',
})
export class LoaderComponent {
  title = input<string>('Загрузка данных...');
  status = input<string>('Пожалуйста, подождите...');
  seconds = input<number>(0);
  showTimer = input<boolean>(true);
  showShimmer = input<boolean>(true);
  retryAfter = input<number>(12);
  accent = input<'purple' | 'emerald' | 'sky' | 'amber'>('purple');

  retry = output<void>();

  // Styling based on accent
  readonly outerRingClass = computed(() => {
    switch (this.accent()) {
      case 'emerald':
        return 'border-emerald-500/20 border-t-emerald-500 border-r-emerald-400';
      case 'sky':
        return 'border-sky-500/20 border-t-sky-500 border-r-sky-400';
      case 'amber':
        return 'border-amber-500/20 border-t-amber-500 border-r-amber-400';
      case 'purple':
      default:
        return 'border-purple-500/20 border-t-purple-500 border-r-purple-400';
    }
  });

  readonly innerRingClass = computed(() => {
    switch (this.accent()) {
      case 'emerald':
        return 'border-teal-400/20 border-b-teal-400';
      case 'sky':
        return 'border-indigo-400/20 border-b-indigo-400';
      case 'amber':
        return 'border-orange-400/20 border-b-orange-400';
      case 'purple':
      default:
        return 'border-sky-400/20 border-b-sky-400';
    }
  });

  readonly pulseDotClass = computed(() => {
    switch (this.accent()) {
      case 'emerald':
        return 'bg-emerald-400';
      case 'sky':
        return 'bg-sky-400';
      case 'amber':
        return 'bg-amber-400';
      case 'purple':
      default:
        return 'bg-purple-400';
    }
  });

  readonly statusTextClass = computed(() => {
    switch (this.accent()) {
      case 'emerald':
        return 'text-emerald-300';
      case 'sky':
        return 'text-sky-300';
      case 'amber':
        return 'text-amber-300';
      case 'purple':
      default:
        return 'text-purple-300';
    }
  });

  readonly shimmerGradientClass = computed(() => {
    switch (this.accent()) {
      case 'emerald':
        return 'via-emerald-400';
      case 'sky':
        return 'via-sky-400';
      case 'amber':
        return 'via-amber-400';
      case 'purple':
      default:
        return 'via-purple-400';
    }
  });

  readonly retryButtonClass = computed(() => {
    switch (this.accent()) {
      case 'emerald':
        return 'bg-emerald-600/30 hover:bg-emerald-600/50 text-emerald-200 border-emerald-500/40';
      case 'sky':
        return 'bg-sky-600/30 hover:bg-sky-600/50 text-sky-200 border-sky-500/40';
      case 'amber':
        return 'bg-amber-600/30 hover:bg-amber-600/50 text-amber-200 border-amber-500/40';
      case 'purple':
      default:
        return 'bg-purple-600/30 hover:bg-purple-600/50 text-purple-200 border-purple-500/40';
    }
  });
}
