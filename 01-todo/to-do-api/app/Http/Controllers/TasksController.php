<?php

namespace App\Http\Controllers;

use App\Models\Tasks;
use App\Http\Requests\StoreTasksRequest;
use App\Http\Requests\UpdateTasksRequest;
use Illuminate\Http\Request;
use App\Services\TaskService;

class TasksController extends Controller
{
    protected TaskService $taskService;

    public function __construct(TaskService $taskService)
    {
        $this->taskService = $taskService;
    }
    /**
     * Display a listing of the resource.
     */
    public function index(Request $request)
    {
        //return $request->status;
        // 1. Capturamos el estatus (por defecto null)
        $status = $request->query('status');

        // 2. Capturamos per_page. Si no viene en la URL, tomará 10 por defecto
        $perPage = $request->query('per_page', 10);

        // 3. Pasamos ambos parámetros al método del servicio
        // Forzamos el casteo a entero (int) para asegurar que el Service reciba un número
        $tasks = $this->taskService->getAllTasks((int) $perPage, $status);
        
        return response()->json($tasks, 200);
    }

    public function store(Request $request)
    {
        $valitador = $request->validate([
            "titulo" => "required",
            "descripcion" => "required",
            "status" => "required"
        ]);
        $task=$this->taskService->createTask($valitador);
        return response()->json($task, 201);
    }

    public function show(int $id)
    {
        $task = $this->taskService->getTaskById($id);
        if (!$task) {
            return response()->json([
                "message" => "Tarea no encontrada",
                "data" => null
            ], 404);
        }
        return response()->json($task, 200);
    }

    public function update(Request $request, $id)
    {
        $task = $this->taskService->updateTask($id, $request->all());
        if (!$task) {
            return response()->json([
                "message" => "Tarea no encontrada",
                "data" => null
            ], 404);
        }
        return response()->json($task, 200);
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy($id)
    {
        $task = $this->taskService->deleteTask($id);
        if (!$task) {
            return response()->json([
                "message" => "Tarea no encontrada",
                "data" => null
            ], 404);
        }
        return response()->json(["message" => "Tarea eliminada"], 200);
    }
}
