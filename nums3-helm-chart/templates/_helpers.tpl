{{/*
Expand the name of the chart.
*/}}
{{- define "nums3-console.name" -}}
{{- default .Chart.Name .Values.nameOverride | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Create a default fully qualified app name.
*/}}
{{- define "nums3-console.fullname" -}}
{{- if .Values.fullnameOverride }}
{{- .Values.fullnameOverride | trunc 63 | trimSuffix "-" }}
{{- else }}
{{- $name := default .Chart.Name .Values.nameOverride }}
{{- if contains $name .Release.Name }}
{{- .Release.Name | trunc 63 | trimSuffix "-" }}
{{- else }}
{{- printf "%s-%s" .Release.Name $name | trunc 63 | trimSuffix "-" }}
{{- end }}
{{- end }}
{{- end }}

{{/*
Create chart name and version as used by the chart label.
*/}}
{{- define "nums3-console.chart" -}}
{{- printf "%s-%s" .Chart.Name .Chart.Version | replace "+" "_" | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Common labels
*/}}
{{- define "nums3-console.labels" -}}
helm.sh/chart: {{ include "nums3-console.chart" . }}
{{ include "nums3-console.selectorLabels" . }}
{{- if .Chart.AppVersion }}
app.kubernetes.io/version: {{ .Chart.AppVersion | quote }}
{{- end }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
{{- end }}

{{/*
Selector labels
*/}}
{{- define "nums3-console.selectorLabels" -}}
app.kubernetes.io/name: {{ include "nums3-console.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
{{- end }}

{{/*
Frontend labels
*/}}
{{- define "nums3-console.frontend.labels" -}}
{{ include "nums3-console.labels" . }}
app.kubernetes.io/component: frontend
{{- end }}

{{/*
Frontend selector labels
*/}}
{{- define "nums3-console.frontend.selectorLabels" -}}
{{ include "nums3-console.selectorLabels" . }}
app.kubernetes.io/component: frontend
{{- end }}

{{/*
Proxy labels
*/}}
{{- define "nums3-console.proxy.labels" -}}
{{ include "nums3-console.labels" . }}
app.kubernetes.io/component: proxy
{{- end }}

{{/*
Proxy selector labels
*/}}
{{- define "nums3-console.proxy.selectorLabels" -}}
{{ include "nums3-console.selectorLabels" . }}
app.kubernetes.io/component: proxy
{{- end }}

{{/*
Create the name of the service account to use
*/}}
{{- define "nums3-console.serviceAccountName" -}}
{{- if .Values.serviceAccount.create }}
{{- default (include "nums3-console.fullname" .) .Values.serviceAccount.name }}
{{- else }}
{{- default "default" .Values.serviceAccount.name }}
{{- end }}
{{- end }}

{{/*
Return the proper image name
*/}}
{{- define "nums3-console.image" -}}
{{- $tag := .Values.image.tag | default .Chart.AppVersion -}}
{{- printf "%s:%s" .Values.image.repository $tag -}}
{{- end }}
