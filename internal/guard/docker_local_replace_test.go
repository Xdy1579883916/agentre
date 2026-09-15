package guard

import (
	"os"
	"path/filepath"
	"strings"
	"testing"
)

// go.mod 里每一条指向仓内目录的 replace,都必须在 deploy/Dockerfile 的
// `RUN go mod download` **之前**就被 COPY 进构建上下文。少一条,那一步就直接报
// `reading pkg/xxx/go.mod: no such file or directory`,镜像根本打不出来。
//
// 这条守卫是补出来的:pkg/syncwire 在 2026-09-13 随共享协议那一轮进来,Dockerfile
// 的拷贝清单没跟上,Nightly 的 agentred 镜像因此连着断了两天 —— 白天的 CI 不打镜像,
// 只有每晚那一次会红,而没人守夜。嵌套 module 是按目录拷进去的,新增一个就要动这份
// 清单,而「忘了动」在编译期毫无痕迹:本机 go build 有整个工作区在,永远是绿的。
func TestGivenALocalModuleReplaceWhenTheImageIsBuiltThenItIsCopiedBeforeModDownload(t *testing.T) {
	t.Parallel()
	root := repositoryRoot(t)

	goMod, err := os.ReadFile(filepath.Join(root, "go.mod")) //nolint:gosec // 守卫读取仓库内固定相对路径。
	if err != nil {
		t.Fatalf("read go.mod: %v", err)
	}
	replaced := localReplaceDirs(string(goMod))
	if len(replaced) == 0 {
		t.Fatal("go.mod 里一条指向仓内目录的 replace 都没解析出来:守卫会变成空转,先修解析")
	}

	dockerfile, err := os.ReadFile(filepath.Join(root, "deploy", "Dockerfile")) //nolint:gosec // 守卫读取仓库内固定相对路径。
	if err != nil {
		t.Fatalf("read deploy/Dockerfile: %v", err)
	}
	prelude, _, found := strings.Cut(string(dockerfile), "RUN go mod download")
	if !found {
		t.Fatal("deploy/Dockerfile 里没有 `RUN go mod download`:这条守卫钉的位置变了,跟着改")
	}

	for _, dir := range replaced {
		if !copiedIn(prelude, dir) {
			t.Errorf("go.mod 把 %s 替换到仓内目录,但 deploy/Dockerfile 在 go mod download 之前没有 COPY 它;"+
				"镜像会在那一步报 reading %s/go.mod: no such file or directory", dir, dir)
		}
	}
}

// localReplaceDirs 取出所有 `=> ./<dir>` 的替换目标,单行与 replace( ) 块都认。
func localReplaceDirs(goMod string) []string {
	var dirs []string
	for _, line := range strings.Split(goMod, "\n") {
		_, target, ok := strings.Cut(line, "=> ./")
		if !ok {
			continue
		}
		if dir := strings.TrimSpace(target); dir != "" {
			dirs = append(dirs, dir)
		}
	}
	return dirs
}

// copiedIn 判断这一段 Dockerfile 里有没有把 dir 整个拷进去。
func copiedIn(dockerfileSection, dir string) bool {
	for _, line := range strings.Split(dockerfileSection, "\n") {
		fields := strings.Fields(line)
		if len(fields) >= 2 && fields[0] == "COPY" && fields[1] == dir {
			return true
		}
	}
	return false
}
