import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Nav } from './shared/components/nav/nav';
import { SubNav } from './shared/components/sub-nav/sub-nav';
import { CaptureInput } from './shared/components/capture-input/capture-input';
import { ToastStack } from './shared/components/toast/toast-stack';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, Nav, SubNav, CaptureInput, ToastStack],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {}
