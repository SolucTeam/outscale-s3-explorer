{{/*
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
NumS3-Console - Template Helpers
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Ces fonctions helper sont utilisées dans tous les templates pour
garantir la cohérence des noms et labels.
*/}}

{{/*
Expand the name of the chart.
Usage: {{ include "outscale-s3-explorer.name" . }}
Output: outscale-s3-explorer (ou valeur de .Values.nameOverride)
*/}}
{{- define "outscale-s3-explorer.name" -}}
{{- default .Chart.Name .Values.nameOverride | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Create a default fully qualified app name.
Usage: {{ include "outscale-s3-explorer.fullname" . }}
Output: <release-name>-outscale-s3-explorer
Notes: 
  - Limité à 63 caractères (limite DNS Kubernetes)
  - Peut être surchargé avec .Values.fullnameOverride
*/}}
{{- define "outscale-s3-explorer.fullname" -}}
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
Usage: {{ include "outscale-s3-explorer.chart" . }}
Output: outscale-s3-explorer-1.0.0
*/}}
{{- define "outscale-s3-explorer.chart" -}}
{{- printf "%s-%s" .Chart.Name .Chart.Version | replace "+" "_" | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Common labels - Applied to all resources
Usage: {{ include "outscale-s3-explorer.labels" . | nindent 4 }}
Output:
  helm.sh/chart: outscale-s3-explorer-1.0.0
  app.kubernetes.io/name: outscale-s3-explorer
  app.kubernetes.io/instance: my-release
  app.kubernetes.io/version: "1.0.0"
  app.kubernetes.io/managed-by: Helm
*/}}
{{- define "outscale-s3-explorer.labels" -}}
helm.sh/chart: {{ include "outscale-s3-explorer.chart" . }}
{{ include "outscale-s3-explorer.selectorLabels" . }}
{{- if .Chart.AppVersion }}
app.kubernetes.io/version: {{ .Chart.AppVersion | quote }}
{{- end }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
{{- end }}

{{/*
Selector labels - Used for matching pods with services
Usage: {{ include "outscale-s3-explorer.selectorLabels" . | nindent 6 }}
Output:
  app.kubernetes.io/name: outscale-s3-explorer
  app.kubernetes.io/instance: my-release
Notes:
  - Ces labels DOIVENT être stables (ne changent jamais)
  - Utilisés par les Services, Deployments, etc.
*/}}
{{- define "outscale-s3-explorer.selectorLabels" -}}
app.kubernetes.io/name: {{ include "outscale-s3-explorer.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
{{- end }}