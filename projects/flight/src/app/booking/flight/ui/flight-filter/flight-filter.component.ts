import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output, computed, effect, inject } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { FlightFilter } from '../../logic/model/flight-filter';
import { FlightFilterStore } from './flight-filter.store';
import { triggerNonReactiveContext } from './reactive-context.util';
import { debounceTime } from 'rxjs';
import { SIGNAL, SIGNAL_NODE } from '@angular/core/primitives/signals';


@Component({
  selector: 'app-flight-filter',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,

  ],
  templateUrl: './flight-filter.component.html',
  providers: [FlightFilterStore],
})
export class FlightFilterComponent {
  protected localStore = inject(FlightFilterStore);

  @Input() set filter(filter: FlightFilter) {
    this.inputFilterForm.setValue(filter);
  }

  @Output() searchTrigger = new EventEmitter<FlightFilter>();

  protected lazyFrom = toSignal(
    toObservable(
      computed(() => this.localStore.inputFilter.from())
    ).pipe(
      debounceTime(300)
    ),
    { initialValue: this.localStore.inputFilter.from() }
  );
  flightRoute = computed(() => [
    'From',
    this.lazyFrom(),
    'to',
    this.localStore.inputFilter.to()
  ].join(' ') + '.');

  protected inputFilterForm = inject(FormBuilder).nonNullable.group({
    from: ['', [Validators.required]],
    to: ['', [Validators.required]],
    urgent: [false],
  });

  protected selectedFilterControl = new FormControl(this.inputFilterForm.getRawValue(), {
    nonNullable: true,
  });

  constructor() {
    effect(
      () => console.log(this.flightRoute())
    );

    console.log(this.flightRoute[SIGNAL]);

    this.initLocalStore();
  }

  initLocalStore(): void {
    this.localStore.initInputFilterUpdate(this.inputFilterForm.valueChanges);
    this.localStore.initSelectedFilterUpdate(
      this.selectedFilterControl.valueChanges
    );
    triggerNonReactiveContext(this.localStore.selectedFilter, (trigger) => {
      if (trigger?.from && trigger?.to) {
        this.inputFilterForm.patchValue(trigger);
      }
    });
    triggerNonReactiveContext(this.localStore.latestFilter, (trigger) => {
      this.selectedFilterControl.setValue(trigger);
    });
    triggerNonReactiveContext(this.localStore.latestFilter, (trigger) => {
      trigger && this.searchTrigger.emit(trigger);
    });
  }
}
