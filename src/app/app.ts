import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Nav } from './shared/components/nav/nav';
import { CaptureInput } from './shared/components/capture-input/capture-input';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, Nav, CaptureInput],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {}
