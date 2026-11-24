{{- define "portfolio.podSecurity" -}}
runAsNonRoot: true
runAsUser: 1000
runAsGroup: 1000
seccompProfile: {type: RuntimeDefault}
{{- end }}
{{- define "portfolio.ctrSecurity" -}}
allowPrivilegeEscalation: false
capabilities: {drop: ["ALL"]}
{{- end }}
